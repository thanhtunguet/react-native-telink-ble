import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import TelinkBle, {
  MeshEventType,
  type DiscoveredDevice,
  type MeshNode,
  type MeshNetworkConfig,
} from 'react-native-telink-ble';

export default function App() {
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredDevice[]
  >([]);
  const [meshNodes, setMeshNodes] = useState<MeshNode[]>([]);
  const [networkInitialized, setNetworkInitialized] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const setupEventListeners = React.useCallback(() => {
    TelinkBle.addEventListener(
      MeshEventType.DEVICE_FOUND,
      (device: DiscoveredDevice) => {
        console.log('Device found:', device);
        setDiscoveredDevices((prev) => {
          const exists = prev.find((d) => d.address === device.address);
          if (!exists) {
            return [...prev, device];
          }
          return prev;
        });
      }
    );

    TelinkBle.addEventListener(MeshEventType.SCAN_STARTED, () => {
      console.log('Scan started');
      setIsScanning(true);
    });

    TelinkBle.addEventListener(MeshEventType.SCAN_STOPPED, () => {
      console.log('Scan stopped');
      setIsScanning(false);
    });

    TelinkBle.addEventListener(
      MeshEventType.PROVISIONING_PROGRESS,
      (progress) => {
        console.log('Provisioning progress:', progress);
      }
    );

    TelinkBle.addEventListener(
      MeshEventType.PROVISIONING_COMPLETED,
      (result) => {
        console.log('Provisioning completed:', result);
        setIsProvisioning(false);
        loadMeshNodes();
      }
    );

    TelinkBle.addEventListener(MeshEventType.PROVISIONING_FAILED, (error) => {
      console.log('Provisioning failed:', error);
      setIsProvisioning(false);
      Alert.alert('Provisioning Failed', error.message || 'Unknown error');
    });
  }, []);

  useEffect(() => {
    initializeApp();
    setupEventListeners();

    return () => {
      TelinkBle.removeAllListeners();
    };
  }, [setupEventListeners]);

  const initializeApp = async () => {
    try {
      const bluetoothEnabled = await TelinkBle.isBluetoothEnabled();
      const permission = await TelinkBle.checkBluetoothPermission();

      setIsBluetoothEnabled(bluetoothEnabled);
      setHasPermission(permission);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await TelinkBle.requestBluetoothPermission();
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Bluetooth permission is required to use this app'
        );
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
    }
  };

  const initializeMeshNetwork = async () => {
    try {
      const config: MeshNetworkConfig = {
        networkName: 'MyMeshNetwork',
        networkKey: '7dd7364cd842ad18c17c2b820c84c3d6',
        appKey: '63964771734fbd76e3b40519d1d94a48',
        ivIndex: 0,
        sequenceNumber: 0,
      };

      await TelinkBle.initializeMeshNetwork(config);
      setNetworkInitialized(true);
      Alert.alert('Success', 'Mesh network initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize mesh network:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to initialize mesh network'
      );
    }
  };

  const startScanning = async () => {
    try {
      setDiscoveredDevices([]);
      await TelinkBle.startScanning({
        duration: 30000,
        rssiThreshold: -80,
      });
    } catch (error: any) {
      console.error('Failed to start scanning:', error);
      Alert.alert('Error', error.message || 'Failed to start scanning');
    }
  };

  const stopScanning = async () => {
    try {
      await TelinkBle.stopScanning();
    } catch (error: any) {
      console.error('Failed to stop scanning:', error);
    }
  };

  const provisionDevice = async (device: DiscoveredDevice) => {
    try {
      if (!networkInitialized) {
        Alert.alert('Error', 'Please initialize mesh network first');
        return;
      }

      setIsProvisioning(true);

      const config = {
        unicastAddress: 1 + meshNodes.length, // Simple address assignment
        networkKeyIndex: 0,
        flags: 0,
        ivIndex: 0,
        attentionDuration: 5,
      };

      const result = await TelinkBle.startProvisioning(device, config);
      console.log('Provisioning result:', result);

      if (result.success) {
        Alert.alert(
          'Success',
          `Device provisioned successfully at address ${result.nodeAddress}`
        );
      }
    } catch (error: any) {
      console.error('Failed to provision device:', error);
      setIsProvisioning(false);
      Alert.alert('Error', error.message || 'Failed to provision device');
    }
  };

  const loadMeshNodes = async () => {
    try {
      const nodes = await TelinkBle.getAllNodes();
      setMeshNodes(nodes);
    } catch (error: any) {
      console.error('Failed to load mesh nodes:', error);
    }
  };

  const toggleDevice = async (node: MeshNode, isOn: boolean) => {
    try {
      await TelinkBle.sendGenericOnOff(node.unicastAddress, isOn);
      Alert.alert('Success', `Device ${isOn ? 'turned on' : 'turned off'}`);
    } catch (error: any) {
      console.error('Failed to control device:', error);
      Alert.alert('Error', error.message || 'Failed to control device');
    }
  };

  const renderStatusCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>System Status</Text>
      <View style={styles.statusRow}>
        <Text>Bluetooth Enabled:</Text>
        <Text style={isBluetoothEnabled ? styles.statusGood : styles.statusBad}>
          {isBluetoothEnabled ? 'Yes' : 'No'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text>Permissions Granted:</Text>
        <Text style={hasPermission ? styles.statusGood : styles.statusBad}>
          {hasPermission ? 'Yes' : 'No'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text>Network Initialized:</Text>
        <Text style={networkInitialized ? styles.statusGood : styles.statusBad}>
          {networkInitialized ? 'Yes' : 'No'}
        </Text>
      </View>

      {!hasPermission && (
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Request Permissions</Text>
        </TouchableOpacity>
      )}

      {!networkInitialized && (
        <TouchableOpacity style={styles.button} onPress={initializeMeshNetwork}>
          <Text style={styles.buttonText}>Initialize Mesh Network</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderScanningCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Device Scanning</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, isScanning && styles.buttonDisabled]}
          onPress={startScanning}
          disabled={isScanning || !hasPermission}
        >
          <Text style={styles.buttonText}>Start Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !isScanning && styles.buttonDisabled]}
          onPress={stopScanning}
          disabled={!isScanning}
        >
          <Text style={styles.buttonText}>Stop Scan</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subTitle}>
        Discovered Devices ({discoveredDevices.length})
      </Text>
      {discoveredDevices.map((device) => (
        <View key={device.address} style={styles.deviceItem}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {device.name || 'Unknown Device'}
            </Text>
            <Text style={styles.deviceAddress}>{device.address}</Text>
            <Text style={styles.deviceRssi}>RSSI: {device.rssi} dBm</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.button,
              styles.smallButton,
              isProvisioning && styles.buttonDisabled,
            ]}
            onPress={() => provisionDevice(device)}
            disabled={isProvisioning || !networkInitialized}
          >
            <Text style={styles.buttonText}>Provision</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderMeshNodesCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mesh Nodes ({meshNodes.length})</Text>
      <TouchableOpacity style={styles.button} onPress={loadMeshNodes}>
        <Text style={styles.buttonText}>Refresh Nodes</Text>
      </TouchableOpacity>

      {meshNodes.map((node) => (
        <View key={node.unicastAddress} style={styles.deviceItem}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {node.name || `Node ${node.unicastAddress}`}
            </Text>
            <Text style={styles.deviceAddress}>
              Address: {node.unicastAddress}
            </Text>
            <Text
              style={[
                styles.deviceRssi,
                node.isOnline ? styles.statusGood : styles.statusBad,
              ]}
            >
              {node.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.button, styles.smallButton]}
              onPress={() => toggleDevice(node, true)}
            >
              <Text style={styles.buttonText}>ON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.smallButton]}
              onPress={() => toggleDevice(node, false)}
            >
              <Text style={styles.buttonText}>OFF</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Telink BLE Mesh Demo</Text>
      </View>

      {renderStatusCard()}
      {renderScanningCard()}
      {renderMeshNodesCard()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#555',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusGood: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  statusBad: {
    color: '#F44336',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 0,
    marginHorizontal: 2,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginVertical: 5,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  controlButtons: {
    flexDirection: 'row',
  },
});
