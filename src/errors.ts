import { TelinkErrorCode, type TelinkErrorDetails } from './types';

type TelinkRuntime = {
  isBluetoothEnabled: () => Promise<boolean>;
  requestBluetoothPermission: () => Promise<boolean>;
  loadMeshNetwork: (networkData: string) => Promise<void>;
};

type MeshStateLoader = () => Promise<string | null>;

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
  onRetry?: (context: { attempt: number; error: unknown }) => void;
}

export interface ErrorRecoveryManagerOptions {
  telink?: TelinkRuntime;
  loadNetworkState?: MeshStateLoader;
  delayFn?: (ms: number) => Promise<void>;
}

const defaultDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

let telinkProvider: (() => TelinkRuntime | undefined) | undefined;

export const registerTelinkProvider = (
  provider: () => TelinkRuntime | undefined
) => {
  telinkProvider = provider;
};

export class TelinkError extends Error {
  readonly code: TelinkErrorCode;
  readonly details: TelinkErrorDetails;

  constructor(
    code: TelinkErrorCode,
    message: string,
    details?: Partial<Omit<TelinkErrorDetails, 'code' | 'message'>>
  ) {
    super(message);
    this.code = code;
    this.name = 'TelinkError';
    this.details = {
      code,
      message,
      timestamp: details?.timestamp ?? new Date(),
      nativeError: details?.nativeError,
      context: details?.context,
      retryable: details?.retryable ?? false,
    };
    Object.setPrototypeOf(this, TelinkError.prototype);
  }

  static isTelinkError(error: unknown): error is TelinkError {
    return error instanceof TelinkError;
  }

  static fromUnknown(
    error: unknown,
    fallbackCode: TelinkErrorCode = TelinkErrorCode.UNKNOWN_ERROR
  ): TelinkError {
    if (error instanceof TelinkError) {
      return error;
    }

    if (error instanceof Error) {
      return new TelinkError(fallbackCode, error.message, {
        nativeError: error,
      });
    }

    return new TelinkError(
      fallbackCode,
      typeof error === 'string' ? error : 'Unknown error',
      { nativeError: error }
    );
  }
}

export class ErrorRecoveryManager {
  private telink?: TelinkRuntime;
  private loadNetworkState?: MeshStateLoader;
  private readonly delayFn: (ms: number) => Promise<void>;

  constructor(options: ErrorRecoveryManagerOptions = {}) {
    this.telink = options.telink ?? telinkProvider?.();
    this.loadNetworkState = options.loadNetworkState;
    this.delayFn = options.delayFn ?? defaultDelay;
  }

  /**
   * Update the Telink runtime dependency (useful for tests).
   */
  setTelinkRuntime(runtime: TelinkRuntime | undefined): void {
    this.telink = runtime;
  }

  /**
   * Provide a network state loader used for recovery.
   */
  setNetworkStateLoader(loader: MeshStateLoader | undefined): void {
    this.loadNetworkState = loader;
  }

  /**
   * Execute an operation with retry semantics and exponential backoff.
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    baseDelayMs?: number
  ): Promise<T>;
  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T>;
  async withRetry<T>(
    operation: () => Promise<T>,
    arg1?: number | RetryOptions,
    arg2?: number
  ): Promise<T> {
    const options: RetryOptions =
      typeof arg1 === 'number'
        ? { maxRetries: arg1, baseDelayMs: arg2 }
        : (arg1 ?? {});

    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelayMs ?? 1000;
    const maxDelay = options.maxDelayMs ?? baseDelay * 8;
    const jitter = options.jitterMs ?? 100;

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) {
          break;
        }

        options.onRetry?.({ attempt: attempt + 1, error });

        const backoff = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
        const jitterDelta = Math.floor(Math.random() * jitter - jitter / 2);
        const delay = Math.max(0, backoff + jitterDelta);

        await this.delayFn(delay);
      }

      attempt++;
    }

    throw TelinkError.fromUnknown(lastError);
  }

  /**
   * Attempt to recover Bluetooth connectivity by checking permissions/state.
   */
  async recoverConnection(): Promise<void> {
    const runtime = this.ensureTelink();
    const bluetoothEnabled = await runtime.isBluetoothEnabled();

    if (!bluetoothEnabled) {
      const granted = await runtime.requestBluetoothPermission();
      if (!granted) {
        throw new TelinkError(
          TelinkErrorCode.BLUETOOTH_PERMISSION_DENIED,
          'Bluetooth permission not granted. Unable to recover connection.',
          { retryable: false }
        );
      }
    }

    // Give the system a moment to stabilize Bluetooth state.
    await this.delayFn(2000);
  }

  /**
   * Attempt to reload the last known-good mesh network state.
   */
  async recoverNetworkState(): Promise<void> {
    const runtime = this.ensureTelink();

    if (!this.loadNetworkState) {
      throw new TelinkError(
        TelinkErrorCode.NETWORK_NOT_INITIALIZED,
        'No network state loader configured for recovery',
        { retryable: false }
      );
    }

    const savedState = await this.loadNetworkState();

    if (!savedState) {
      throw new TelinkError(
        TelinkErrorCode.NETWORK_NOT_INITIALIZED,
        'No saved network state available for recovery',
        { retryable: false }
      );
    }

    await runtime.loadMeshNetwork(savedState);
  }

  private ensureTelink(): TelinkRuntime {
    if (!this.telink) {
      const runtime = telinkProvider?.();
      if (!runtime) {
        throw new TelinkError(
          TelinkErrorCode.UNKNOWN_ERROR,
          'Telink runtime is not available',
          { retryable: false }
        );
      }
      this.telink = runtime;
    }

    return this.telink;
  }
}

export default TelinkError;
