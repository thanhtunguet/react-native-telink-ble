import telinkBle from './index';
import type { ColorHSL, ControlOptions, SceneDevice } from './types';

/**
 * High-level device control helper class
 * Provides convenient methods for controlling BLE mesh devices
 */
export class DeviceController {
  /**
   * Turn device(s) on or off
   * @param target Single address or array of addresses
   * @param isOn True to turn on, false to turn off
   * @param options Control options (transition time, delay, etc.)
   */
  async setDeviceState(
    target: number | number[],
    isOn: boolean,
    options?: ControlOptions
  ): Promise<void> {
    const addresses = Array.isArray(target) ? target : [target];

    await Promise.all(
      addresses.map((addr) =>
        telinkBle.sendGenericOnOff(addr, isOn, options?.transitionTime)
      )
    );
  }

  /**
   * Set device brightness level
   * @param target Single address or array of addresses
   * @param level Brightness level (0-100)
   * @param options Control options
   */
  async setDeviceLevel(
    target: number | number[],
    level: number,
    options?: ControlOptions
  ): Promise<void> {
    const normalizedLevel = Math.max(0, Math.min(100, level));
    const addresses = Array.isArray(target) ? target : [target];

    await Promise.all(
      addresses.map((addr) =>
        telinkBle.sendGenericLevel(
          addr,
          normalizedLevel,
          options?.transitionTime
        )
      )
    );
  }

  /**
   * Set device color (HSL)
   * @param target Single address or array of addresses
   * @param color HSL color values
   * @param options Control options
   */
  async setDeviceColor(
    target: number | number[],
    color: ColorHSL,
    options?: ControlOptions
  ): Promise<void> {
    const addresses = Array.isArray(target) ? target : [target];

    await Promise.all(
      addresses.map((addr) =>
        telinkBle.sendColorHSL(
          addr,
          color.hue,
          color.saturation,
          color.lightness,
          options?.transitionTime
        )
      )
    );
  }

  /**
   * Control all devices in a group
   * @param groupAddress Group address
   * @param isOn True to turn on, false to turn off
   * @param options Control options
   */
  async controlGroup(
    groupAddress: number,
    isOn: boolean,
    options?: ControlOptions
  ): Promise<void> {
    await telinkBle.sendGroupCommand(
      groupAddress,
      isOn,
      options?.transitionTime
    );
  }

  /**
   * Store current state as a scene
   * @param sceneId Scene identifier (0-65535)
   * @param devices Array of device addresses or group address
   */
  async storeScene(sceneId: number, devices: number | number[]): Promise<void> {
    const addresses = Array.isArray(devices) ? devices : [devices];

    for (const addr of addresses) {
      await telinkBle.sendSceneStore(addr, sceneId);
    }
  }

  /**
   * Recall a previously stored scene
   * @param sceneId Scene identifier
   * @param target Single address, array of addresses, or group address
   */
  async recallScene(sceneId: number, target: number | number[]): Promise<void> {
    const addresses = Array.isArray(target) ? target : [target];

    await Promise.all(
      addresses.map((addr) => telinkBle.sendSceneRecall(addr, sceneId))
    );
  }

  /**
   * Delete a stored scene
   * @param sceneId Scene identifier
   * @param target Single address or array of addresses
   */
  async deleteScene(sceneId: number, target: number | number[]): Promise<void> {
    const addresses = Array.isArray(target) ? target : [target];

    await Promise.all(
      addresses.map((addr) => telinkBle.sendSceneDelete(addr, sceneId))
    );
  }

  /**
   * Get list of stored scenes on a device
   * @param address Device address
   * @returns Array of scene IDs
   */
  async getStoredScenes(address: number): Promise<number[]> {
    return await telinkBle.sendSceneRegisterGet(address);
  }

  /**
   * Create a scene with specific device states
   * @param sceneId Scene identifier
   * @param devices Array of device configurations
   */
  async createScene(sceneId: number, devices: SceneDevice[]): Promise<void> {
    // Set each device to desired state
    for (const device of devices) {
      if (device.onOff !== undefined) {
        await telinkBle.sendGenericOnOff(device.address, device.onOff, 0);
      }

      if (device.level !== undefined) {
        await telinkBle.sendGenericLevel(device.address, device.level, 0);
      }

      if (device.color) {
        await telinkBle.sendColorHSL(
          device.address,
          device.color.hue,
          device.color.saturation,
          device.color.lightness,
          0
        );
      }

      // Store the scene on this device
      await telinkBle.sendSceneStore(device.address, sceneId);
    }
  }

  /**
   * Turn on multiple devices with smooth transition
   * @param addresses Array of device addresses
   * @param transitionTime Transition time in milliseconds
   */
  async turnOnDevices(
    addresses: number[],
    transitionTime: number = 500
  ): Promise<void> {
    await this.setDeviceState(addresses, true, { transitionTime });
  }

  /**
   * Turn off multiple devices with smooth transition
   * @param addresses Array of device addresses
   * @param transitionTime Transition time in milliseconds
   */
  async turnOffDevices(
    addresses: number[],
    transitionTime: number = 500
  ): Promise<void> {
    await this.setDeviceState(addresses, false, { transitionTime });
  }

  /**
   * Dim devices to specific level with smooth transition
   * @param addresses Array of device addresses
   * @param level Brightness level (0-100)
   * @param transitionTime Transition time in milliseconds
   */
  async dimDevices(
    addresses: number[],
    level: number,
    transitionTime: number = 1000
  ): Promise<void> {
    await this.setDeviceLevel(addresses, level, { transitionTime });
  }

  /**
   * Set color for multiple devices
   * @param addresses Array of device addresses
   * @param color HSL color
   * @param transitionTime Transition time in milliseconds
   */
  async setColorForDevices(
    addresses: number[],
    color: ColorHSL,
    transitionTime: number = 500
  ): Promise<void> {
    await this.setDeviceColor(addresses, color, { transitionTime });
  }

  /**
   * Execute batch operations on devices
   * Operations are executed sequentially to avoid overwhelming the mesh
   * @param operations Array of operations to execute
   * @param delayBetween Delay between operations in ms (default: 100)
   */
  async executeBatch(
    operations: Array<{
      type: 'onoff' | 'level' | 'color' | 'scene';
      target: number | number[];
      value: boolean | number | ColorHSL;
      options?: ControlOptions;
    }>,
    delayBetween: number = 100
  ): Promise<void> {
    for (const op of operations) {
      switch (op.type) {
        case 'onoff':
          await this.setDeviceState(op.target, op.value as boolean, op.options);
          break;
        case 'level':
          await this.setDeviceLevel(op.target, op.value as number, op.options);
          break;
        case 'color':
          await this.setDeviceColor(
            op.target,
            op.value as ColorHSL,
            op.options
          );
          break;
        case 'scene':
          await this.recallScene(op.value as number, op.target);
          break;
      }

      // Delay between operations
      if (delayBetween > 0) {
        await this.delay(delayBetween);
      }
    }
  }

  /**
   * Create a gradual fade effect
   * @param addresses Device addresses
   * @param fromLevel Starting brightness level
   * @param toLevel Ending brightness level
   * @param duration Total duration in ms
   * @param steps Number of steps
   */
  async fadeLevel(
    addresses: number | number[],
    fromLevel: number,
    toLevel: number,
    duration: number = 2000,
    steps: number = 10
  ): Promise<void> {
    const addrs = Array.isArray(addresses) ? addresses : [addresses];
    const stepDelay = duration / steps;
    const levelStep = (toLevel - fromLevel) / steps;

    for (let i = 0; i <= steps; i++) {
      const currentLevel = fromLevel + levelStep * i;
      await this.setDeviceLevel(addrs, currentLevel, { transitionTime: 0 });
      if (i < steps) {
        await this.delay(stepDelay);
      }
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default DeviceController;
