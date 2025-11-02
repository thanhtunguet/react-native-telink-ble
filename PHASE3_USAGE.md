# Phase 3: Device Control - Usage Guide

This document demonstrates how to use the Phase 3 device control features implemented in the React Native Telink BLE library.

## Features Implemented

- ✅ Enhanced generic On/Off control with transitions
- ✅ Level (brightness) control with smooth dimming
- ✅ Color control (HSL) support
- ✅ Complete scene management (store, recall, delete, query)
- ✅ Enhanced group management with scene support
- ✅ Device control helper class with batch operations
- ✅ Group manager helper class
- ✅ Smooth transitions and fade effects

## Installation

```bash
npm install react-native-telink-ble
# or
yarn add react-native-telink-ble
```

## Basic Device Control

### 1. Generic On/Off Control

```typescript
import telinkBle from 'react-native-telink-ble';

// Turn on a device
await telinkBle.sendGenericOnOff(
  0x0001, // device address
  true,   // turn on
  500     // transition time in ms (optional)
);

// Turn off with smooth transition
await telinkBle.sendGenericOnOff(0x0001, false, 1000);
```

### 2. Brightness Control

```typescript
// Set brightness to 50%
await telinkBle.sendGenericLevel(
  0x0001, // device address
  50,     // level 0-100
  1000    // transition time in ms (optional)
);

// Dim to 25% slowly
await telinkBle.sendGenericLevel(0x0001, 25, 2000);
```

### 3. Color Control (HSL)

```typescript
// Set color to red
await telinkBle.sendColorHSL(
  0x0001,  // device address
  0,       // hue (0-360)
  100,     // saturation (0-100)
  50,      // lightness (0-100)
  500      // transition time (optional)
);

// Set to blue with smooth transition
await telinkBle.sendColorHSL(0x0001, 240, 100, 50, 1000);
```

## Scene Management

### 1. Store a Scene

```typescript
// Set devices to desired state
await telinkBle.sendGenericOnOff(0x0001, true);
await telinkBle.sendGenericLevel(0x0001, 75);
await telinkBle.sendColorHSL(0x0001, 120, 100, 50);

// Store current state as scene 1
await telinkBle.sendSceneStore(0x0001, 1);
```

### 2. Recall a Scene

```typescript
// Recall scene 1
await telinkBle.sendSceneRecall(0x0001, 1);

// Recall on multiple devices
await telinkBle.sendSceneRecall(0x0001, 1);
await telinkBle.sendSceneRecall(0x0002, 1);
await telinkBle.sendSceneRecall(0x0003, 1);
```

### 3. Delete a Scene

```typescript
// Delete scene 1 from device
await telinkBle.sendSceneDelete(0x0001, 1);
```

### 4. Query Stored Scenes

```typescript
// Get list of scenes stored on device
const scenes = await telinkBle.sendSceneRegisterGet(0x0001);
console.log('Stored scenes:', scenes); // e.g., [1, 2, 3, 5]
```

## Group Control

### 1. Create and Manage Groups

```typescript
// Create a group (e.g., Living Room)
await telinkBle.createGroup(0xC000, 'Living Room');

// Add devices to group
await telinkBle.addDeviceToGroup(0x0001, 0xC000);
await telinkBle.addDeviceToGroup(0x0002, 0xC000);
await telinkBle.addDeviceToGroup(0x0003, 0xC000);
```

### 2. Control Entire Group

```typescript
// Turn on all devices in group
await telinkBle.sendGroupCommand(0xC000, true, 500);

// Turn off group with transition
await telinkBle.sendGroupCommand(0xC000, false, 1000);

// Set group brightness
await telinkBle.sendGenericLevel(0xC000, 60, 1000);

// Set group color
await telinkBle.sendColorHSL(0xC000, 180, 100, 50, 500);
```

## Using DeviceController Helper

The `DeviceController` class provides high-level methods for device control:

### 1. Basic Control

```typescript
import { DeviceController } from 'react-native-telink-ble';

const controller = new DeviceController();

// Turn on multiple devices
await controller.setDeviceState([0x0001, 0x0002, 0x0003], true, {
  transitionTime: 500,
});

// Set brightness for multiple devices
await controller.setDeviceLevel([0x0001, 0x0002], 75, {
  transitionTime: 1000,
});

// Set color for devices
await controller.setDeviceColor(
  [0x0001, 0x0002],
  { hue: 240, saturation: 100, lightness: 50 },
  { transitionTime: 500 }
);
```

### 2. Convenience Methods

```typescript
// Turn on devices with default transition
await controller.turnOnDevices([0x0001, 0x0002, 0x0003], 500);

// Turn off devices
await controller.turnOffDevices([0x0001, 0x0002], 1000);

// Dim devices to specific level
await controller.dimDevices([0x0001, 0x0002], 30, 2000);

// Set color for multiple devices
await controller.setColorForDevices(
  [0x0001, 0x0002],
  { hue: 120, saturation: 100, lightness: 50 },
  500
);
```

### 3. Advanced Scene Management

```typescript
// Create a scene with specific device states
await controller.createScene(1, [
  {
    address: 0x0001,
    onOff: true,
    level: 100,
    color: { hue: 0, saturation: 100, lightness: 50 },
  },
  {
    address: 0x0002,
    onOff: true,
    level: 75,
    color: { hue: 120, saturation: 100, lightness: 50 },
  },
  {
    address: 0x0003,
    onOff: true,
    level: 50,
  },
]);

// Recall scene
await controller.recallScene(1, [0x0001, 0x0002, 0x0003]);

// Delete scene
await controller.deleteScene(1, [0x0001, 0x0002, 0x0003]);

// Get stored scenes on device
const scenes = await controller.getStoredScenes(0x0001);
```

### 4. Batch Operations

```typescript
// Execute multiple operations sequentially
await controller.executeBatch(
  [
    { type: 'onoff', target: 0x0001, value: true },
    { type: 'level', target: 0x0001, value: 75 },
    {
      type: 'color',
      target: 0x0001,
      value: { hue: 240, saturation: 100, lightness: 50 },
    },
    { type: 'onoff', target: [0x0002, 0x0003], value: true },
    { type: 'scene', target: 0x0004, value: 1 },
  ],
  100 // delay between operations in ms
);
```

### 5. Fade Effects

```typescript
// Gradual fade from 0% to 100% over 3 seconds
await controller.fadeLevel(
  [0x0001, 0x0002], // devices
  0,                 // from level
  100,               // to level
  3000,              // duration in ms
  20                 // number of steps
);

// Fade down
await controller.fadeLevel([0x0001], 100, 0, 2000, 15);
```

## Using GroupManager Helper

The `GroupManager` class provides comprehensive group management:

### 1. Create and Manage Groups

```typescript
import { GroupManager } from 'react-native-telink-ble';

const groupManager = new GroupManager();

// Create a group
const livingRoom = await groupManager.createGroup(0xC000, 'Living Room');

// Add devices
await groupManager.addDeviceToGroup(0x0001, 0xC000);
await groupManager.addDeviceToGroup(0x0002, 0xC000);

// Add multiple devices at once
await groupManager.addMultipleDevicesToGroup(
  [0x0003, 0x0004, 0x0005],
  0xC000
);
```

### 2. Create Rooms with Devices

```typescript
// Create a complete room in one call
const bedroom = await groupManager.createRoom(
  0xC001,           // group address
  'Bedroom',        // name
  [0x0006, 0x0007, 0x0008] // device addresses
);
```

### 3. Control Groups

```typescript
// Turn on group
await groupManager.turnOnGroup(0xC000, 500);

// Turn off group
await groupManager.turnOffGroup(0xC000, 1000);

// Dim group
await groupManager.dimGroup(0xC000, 40, 2000);

// Set group color
await groupManager.setGroupColor(
  0xC000,
  { hue: 60, saturation: 100, lightness: 50 },
  { transitionTime: 500 }
);
```

### 4. Group Scene Management

```typescript
// Store current group state as scene
await groupManager.storeGroupScene(0xC000, 1);

// Recall group scene
await groupManager.recallGroupScene(0xC000, 1);

// Delete group scene
await groupManager.deleteGroupScene(0xC000, 1);
```

### 5. Query Groups

```typescript
// Get all groups
const allGroups = groupManager.getAllGroups();

// Get specific group
const group = groupManager.getGroup(0xC000);

// Get devices in group
const devices = groupManager.getGroupDevices(0xC000);

// Find groups containing a device
const groups = groupManager.findGroupsWithDevice(0x0001);

// Check if device is in group
const isInGroup = groupManager.isDeviceInGroup(0x0001, 0xC000);
```

### 6. Create Multiple Groups

```typescript
// Create several rooms at once
const rooms = await groupManager.createMultipleGroups([
  { address: 0xC000, name: 'Living Room', devices: [0x0001, 0x0002] },
  { address: 0xC001, name: 'Bedroom', devices: [0x0003, 0x0004] },
  { address: 0xC002, name: 'Kitchen', devices: [0x0005, 0x0006] },
  { address: 0xC003, name: 'Bathroom', devices: [0x0007] },
]);
```

## Complete Example: React Component

```typescript
import React, { useState } from 'react';
import { View, Button, Text, Slider } from 'react-native';
import {
  DeviceController,
  GroupManager,
  ColorHSL,
} from 'react-native-telink-ble';

export default function DeviceControlScreen() {
  const [brightness, setBrightness] = useState(50);
  const [hue, setHue] = useState(0);

  const controller = new DeviceController();
  const groupManager = new GroupManager();

  // Living room group address
  const LIVING_ROOM = 0xC000;
  const BEDROOM = 0xC001;

  const handleTurnOn = async () => {
    await groupManager.turnOnGroup(LIVING_ROOM, 500);
  };

  const handleTurnOff = async () => {
    await groupManager.turnOffGroup(LIVING_ROOM, 1000);
  };

  const handleBrightnessChange = async (value: number) => {
    setBrightness(value);
    await groupManager.dimGroup(LIVING_ROOM, value, 500);
  };

  const handleColorChange = async (hueValue: number) => {
    setHue(hueValue);
    const color: ColorHSL = {
      hue: hueValue,
      saturation: 100,
      lightness: 50,
    };
    await groupManager.setGroupColor(LIVING_ROOM, color, {
      transitionTime: 300,
    });
  };

  const handleRecallScene = async (sceneId: number) => {
    await groupManager.recallGroupScene(LIVING_ROOM, sceneId);
  };

  const handleStoreScene = async (sceneId: number) => {
    await groupManager.storeGroupScene(LIVING_ROOM, sceneId);
  };

  const handleNightMode = async () => {
    // Dim all lights and set warm color
    await controller.executeBatch([
      { type: 'level', target: LIVING_ROOM, value: 20 },
      {
        type: 'color',
        target: LIVING_ROOM,
        value: { hue: 30, saturation: 80, lightness: 40 },
      },
      { type: 'level', target: BEDROOM, value: 10 },
    ]);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Living Room Control</Text>

      <View style={{ marginVertical: 10 }}>
        <Button title="Turn On" onPress={handleTurnOn} />
      </View>

      <View style={{ marginVertical: 10 }}>
        <Button title="Turn Off" onPress={handleTurnOff} />
      </View>

      <View style={{ marginVertical: 20 }}>
        <Text>Brightness: {brightness}%</Text>
        <Slider
          value={brightness}
          minimumValue={0}
          maximumValue={100}
          onValueChange={handleBrightnessChange}
        />
      </View>

      <View style={{ marginVertical: 20 }}>
        <Text>Color (Hue): {hue}°</Text>
        <Slider
          value={hue}
          minimumValue={0}
          maximumValue={360}
          onValueChange={handleColorChange}
        />
      </View>

      <Text style={{ fontSize: 18, marginTop: 20 }}>Scenes</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
        <Button title="Scene 1" onPress={() => handleRecallScene(1)} />
        <Button title="Scene 2" onPress={() => handleRecallScene(2)} />
        <Button title="Scene 3" onPress={() => handleRecallScene(3)} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
        <Button title="Save Scene 1" onPress={() => handleStoreScene(1)} />
        <Button title="Save Scene 2" onPress={() => handleStoreScene(2)} />
      </View>

      <View style={{ marginVertical: 20 }}>
        <Button title="Night Mode" onPress={handleNightMode} />
      </View>
    </View>
  );
}
```

## Common Use Cases

### 1. Smooth Sunrise Effect

```typescript
const controller = new DeviceController();

async function sunriseEffect(devices: number[], durationMinutes: number) {
  const durationMs = durationMinutes * 60 * 1000;

  // Start with warm dim light
  await controller.setDeviceColor(
    devices,
    { hue: 30, saturation: 100, lightness: 20 },
    { transitionTime: 0 }
  );
  await controller.setDeviceLevel(devices, 1, { transitionTime: 0 });

  // Gradually increase brightness
  await controller.fadeLevel(devices, 1, 100, durationMs, 50);

  // Transition to daylight color
  await controller.setDeviceColor(
    devices,
    { hue: 60, saturation: 30, lightness: 80 },
    { transitionTime: 5000 }
  );
}

// Use it
await sunriseEffect([0x0001, 0x0002], 15); // 15-minute sunrise
```

### 2. Party Mode with Color Cycling

```typescript
async function partyMode(devices: number[], durationSeconds: number) {
  const controller = new DeviceController();
  const colors: ColorHSL[] = [
    { hue: 0, saturation: 100, lightness: 50 },    // Red
    { hue: 120, saturation: 100, lightness: 50 },  // Green
    { hue: 240, saturation: 100, lightness: 50 },  // Blue
    { hue: 60, saturation: 100, lightness: 50 },   // Yellow
    { hue: 300, saturation: 100, lightness: 50 },  // Magenta
  ];

  const cycles = Math.floor(durationSeconds / colors.length);

  for (let i = 0; i < cycles; i++) {
    for (const color of colors) {
      await controller.setDeviceColor(devices, color, { transitionTime: 500 });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Use it
await partyMode([0x0001, 0x0002, 0x0003], 60); // 1 minute party mode
```

### 3. Movie Mode

```typescript
async function movieMode(livingRoomGroup: number, otherGroups: number[]) {
  const groupManager = new GroupManager();

  // Dim living room to 20%
  await groupManager.dimGroup(livingRoomGroup, 20, 2000);

  // Set warm color
  await groupManager.setGroupColor(
    livingRoomGroup,
    { hue: 30, saturation: 80, lightness: 30 },
    { transitionTime: 2000 }
  );

  // Turn off other rooms
  for (const group of otherGroups) {
    await groupManager.turnOffGroup(group, 1000);
  }
}
```

## Best Practices

1. **Use Groups**: Control multiple devices efficiently using groups
2. **Smooth Transitions**: Always use transition times for better user experience
3. **Batch Operations**: Use `executeBatch()` for multiple commands to avoid mesh congestion
4. **Scene Management**: Store frequently used states as scenes for quick recall
5. **Error Handling**: Always wrap control commands in try-catch blocks
6. **Delay Management**: Add small delays between rapid commands to prevent mesh overload
7. **Address Management**: Use consistent addressing scheme (e.g., 0xC000-0xCFFF for groups)

## Troubleshooting

### Commands Not Working
- Check if devices are provisioned and online
- Verify correct addresses are being used
- Ensure Bluetooth is enabled
- Check mesh network is initialized

### Delayed Response
- Reduce batch operation size
- Increase delay between commands
- Check mesh network congestion

### Scenes Not Recalling Correctly
- Ensure scene was stored successfully
- Verify devices support scene functionality
- Check scene ID is within valid range (0-65535)

## Next Steps

Phase 3 has completed the device control functionality. The next phases will add:
- Phase 4: Advanced Features (Remote provisioning, Firmware updates, Network health)
- Phase 5: Optimization & Testing

## Support

For issues or questions, please visit:
https://github.com/thanhtunguet/react-native-telink-ble/issues
