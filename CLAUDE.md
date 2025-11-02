# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native Telink BLE is a comprehensive library for BLE mesh networking using Telink's native libraries. It bridges native Android (TelinkBleMeshLib/Kotlin) and iOS (TelinkSigMeshLib/Objective-C) implementations to React Native via TurboModules.

## Development Commands

### Building & Testing
```bash
# Type checking
yarn typecheck

# Linting
yarn lint

# Testing
yarn test

# Clean build artifacts
yarn clean

# Build the library (runs automatically via prepare script)
yarn prepare

# Work with example app
yarn example <command>
```

### Example App Development
```bash
# iOS
cd example
yarn ios

# Android
cd example
yarn android
```

### Release
```bash
# Release new version (uses release-it with conventional changelog)
yarn release
```

## Architecture

### High-Level Structure

**JavaScript/TypeScript Layer** (`src/`)
- `index.tsx` - Main singleton entry point with event handling
- `NativeTelinkBle.ts` - TurboModule spec interface to native code
- `types.ts` - TypeScript definitions for mesh networking types
- `DeviceController.ts` - High-level device control API (on/off, level, color, scenes)
- `ProvisioningWorkflow.ts` - Provisioning orchestration with retry logic
- `GroupManager.ts` - Group and scene management

**Native Layer**
- `android/` - Kotlin implementation using TelinkBleMeshLib
- `ios/` - Objective-C wrapper around TelinkSigMeshLib
- `TelinkSigMeshLib/` - Telink's iOS native library (vendored)

**Bridge Pattern**: The library uses React Native TurboModules for synchronous/asynchronous native calls and NativeEventEmitter for native-to-JS event streaming.

### Key Architectural Decisions

1. **Singleton Pattern**: `TelinkBle` class uses singleton pattern (`getInstance()`) for consistent state management across the app.

2. **Event-Driven**: All async operations (scanning, provisioning, device status) emit events via `NativeEventEmitter`. Subscriptions are tracked internally with unique IDs.

3. **Error Handling**: Native errors are caught, mapped to `TelinkErrorCode` enums, and wrapped with `TelinkErrorDetails` before being thrown to JS.

4. **Helper Classes**: Instead of exposing raw native methods, three helper classes provide higher-level workflows:
   - `DeviceController` - Batch operations, smooth transitions, scene management
   - `ProvisioningWorkflow` - Auto-address allocation, retry logic, batch provisioning
   - `GroupManager` - Local group tracking, multi-device operations

5. **Address Management**:
   - Unicast addresses: Individual devices (0x0001 - 0x7FFF)
   - Group addresses: Collections of devices (0xC000 - 0xFEFF)
   - Addresses auto-increment during provisioning via `ProvisioningWorkflow`

### Data Flow

```
User Code
    ↓
Helper Classes (DeviceController, ProvisioningWorkflow, GroupManager)
    ↓
TelinkBle Singleton (error handling, event subscriptions)
    ↓
NativeTelinkBle TurboModule (type-safe interface)
    ↓
Native Platform Code (Kotlin/Objective-C)
    ↓
Telink Libraries (TelinkBleMeshLib, TelinkSigMeshLib)
```

Events flow in reverse:
```
Native Libraries → NativeEventEmitter → Event Listeners in User Code
```

### Important Type Definitions

- `MeshNetworkConfig` - Network initialization (keys, IV index, sequence number)
- `DiscoveredDevice` - BLE scan results with advertisement data
- `ProvisionConfig` - Provisioning parameters (address, key index, flags)
- `MeshNode` - Provisioned device metadata (address, keys, composition data)
- `MeshEventType` - Enum of all events (provisioning, status, errors)
- `ControlOptions` - Optional parameters (transition time, retries, acknowledgment)

## Common Workflows

### Device Provisioning
1. Initialize mesh network via `initializeMeshNetwork(config)`
2. Start scanning via `startScanning(filters?)`
3. Listen to `DEVICE_FOUND` events
4. Provision device via `ProvisioningWorkflow.provisionDevice(device)` (handles address allocation)
5. Device auto-increments next available address

### Device Control
Use `DeviceController` for all device operations:
- `setDeviceState()` - On/off control (supports single or array of addresses)
- `setDeviceLevel()` - Brightness (0-100)
- `setDeviceColor()` - HSL color control
- `executeBatch()` - Sequential batch operations with delays

### Group Management
Use `GroupManager`:
- Create groups with `createGroup(address, name)`
- Add devices with `addDeviceToGroup()`
- Control entire groups with `controlGroup()`, `setGroupLevel()`, `setGroupColor()`
- Store/recall scenes per group

## Native Platform Integration

### Android (Kotlin)
- Main module: `android/src/main/java/com/telinkble/TelinkBleModule.kt`
- Uses TelinkBleMeshLib Java/Kotlin SDK
- Events emitted via `ReactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)`

### iOS (Objective-C)
- Main module: `ios/TelinkBle.mm` (or `.m`)
- Uses TelinkSigMeshLib framework (vendored in `TelinkSigMeshLib/`)
- Events emitted via `RCTEventEmitter`

### Adding Native Methods
1. Add method signature to `NativeTelinkBle.ts` Spec interface
2. Implement in Android (`TelinkBleModule.kt`) and iOS
3. Add wrapper method in `index.tsx` with error handling
4. Optionally expose via helper classes for better UX

## Code Quality

- **TypeScript**: Strict mode enabled (`tsconfig.json`)
- **Formatting**: Prettier with single quotes, 2-space tabs
- **Linting**: ESLint with React Native config
- **Commit Messages**: Conventional commits enforced via commitlint
- **Git Hooks**: Lefthook for pre-commit/pre-push validation

## Testing

- Jest configured for React Native
- Test files: `src/__tests__/`
- Run: `yarn test`
- Mock native modules in tests (TelinkBleNative not available in Jest)

## Common Pitfalls

1. **Event Listener Cleanup**: Always call `removeEventListener(subscriptionId)` or `removeAllListeners()` to prevent memory leaks.

2. **Address Conflicts**: Ensure unicast addresses are unique. Use `ProvisioningWorkflow` to auto-manage addresses.

3. **Bluetooth Permissions**: Always check/request permissions via `checkBluetoothPermission()` and `requestBluetoothPermission()` before scanning.

4. **Transition Times**: Pass transition times in milliseconds, not seconds. Native code expects milliseconds.

5. **Group Address Range**: Valid group addresses are 0xC000 - 0xFEFF. Do not use unicast address ranges.

6. **Fast Provisioning**: Use `fastProvisionDevices()` or `provisionDevicesInBatches()` for multiple devices. Don't loop `provisionDevice()` without delays.

7. **Error Mapping**: Native error codes are mapped to `TelinkErrorCode` enum. Check `error.details.code` for typed error handling.

## TurboModule Codegen

The library uses new architecture TurboModules:
- Config: `codegenConfig` in `package.json`
- Spec: `NativeTelinkBle.ts` defines the interface
- Generated code: Auto-generated during build via `react-native-builder-bob`

## Build Process

The library uses `react-native-builder-bob` to build:
1. **Module Output** (`lib/module/`) - ESM format for tree-shaking
2. **TypeScript Declarations** (`lib/typescript/`) - Generated from `tsconfig.build.json`

Build happens automatically via `prepare` script (runs on `yarn install`).
