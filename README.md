# react-native-telink-ble

Telink BLE bridge between Telink native libraries and React native applications

This library integrates:
- **Android**: TelinkBleMeshLib - Telink BLE Mesh library for Android
- **iOS**: TelinkSigMeshLib - Telink SIG Mesh library for iOS

## Installation

```sh
npm install react-native-telink-ble
```

### iOS Setup

After installation, run:

```sh
cd ios && pod install
```

The library automatically includes TelinkSigMeshLib and its OpenSSL dependency.

### Android Setup

The library automatically includes TelinkBleMeshLib module. Make sure your app's `AndroidManifest.xml` includes the necessary Bluetooth permissions:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

## Usage

```js
import { multiply } from 'react-native-telink-ble';

// ...

const result = multiply(3, 7);
```


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
