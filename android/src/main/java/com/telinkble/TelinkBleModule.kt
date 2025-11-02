package com.telinkble

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

import com.telink.ble.mesh.foundation.MeshService
import com.telink.ble.mesh.foundation.MeshConfiguration
import com.telink.ble.mesh.foundation.event.*
import com.telink.ble.mesh.foundation.parameter.*
import com.telink.ble.mesh.model.MeshInfo
import com.telink.ble.mesh.model.NodeInfo
import com.telink.ble.mesh.model.UnitConvert
import com.telink.ble.mesh.util.MeshLogger

@ReactModule(name = TelinkBleModule.NAME)
class TelinkBleModule(reactContext: ReactApplicationContext) :
  NativeTelinkBleSpec(reactContext), LifecycleEventListener {

  private var meshService: MeshService? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var currentMeshInfo: MeshInfo? = null
  private val discoveredDevices = mutableListOf<WritableMap>()
  private var isScanning = false

  init {
    reactApplicationContext.addLifecycleEventListener(this)
    setupEventHandlers()
  }

  override fun getName(): String {
    return NAME
  }

  // Legacy method for compatibility
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  // Network Management
  override fun initializeMeshNetwork(config: ReadableMap, promise: Promise) {
    try {
      val networkName = config.getString("networkName") ?: "DefaultNetwork"
      val networkKey = config.getString("networkKey") ?: throw Exception("Network key is required")
      val appKey = config.getString("appKey") ?: throw Exception("App key is required")
      val ivIndex = config.getInt("ivIndex")
      val sequenceNumber = config.getInt("sequenceNumber")

      // Create mesh configuration
      val meshConfiguration = MeshConfiguration()
      meshConfiguration.deviceKeyRefreshEnable = true
      meshConfiguration.onlineStatusEnabled = true

      // Initialize mesh service
      meshService = MeshService.getInstance()
      meshService?.init(reactApplicationContext, meshConfiguration)

      // Create new mesh network
      currentMeshInfo = MeshInfo.createNewMesh(networkName)
      currentMeshInfo?.let { meshInfo ->
        // Set network key
        meshInfo.meshNetKeyList.clear()
        meshInfo.addNetKey(0, UnitConvert.hexString2Bytes(networkKey))
        
        // Set app key
        meshInfo.appKeyList.clear()
        meshInfo.addAppKey(0, 0, UnitConvert.hexString2Bytes(appKey))
        
        // Set IV index and sequence number
        meshInfo.ivIndex = ivIndex
        meshInfo.sequenceNumber = sequenceNumber
        
        // Apply configuration to mesh service
        meshService?.setupMeshNetwork(meshInfo)
      }

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("NETWORK_INIT_ERROR", "Failed to initialize mesh network: ${e.message}", e)
    }
  }

  override fun loadMeshNetwork(networkData: String, promise: Promise) {
    try {
      // Parse and load existing mesh network data
      currentMeshInfo = MeshInfo.fromJson(networkData)
      currentMeshInfo?.let { meshInfo ->
        meshService?.setupMeshNetwork(meshInfo)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("NETWORK_LOAD_ERROR", "Failed to load mesh network: ${e.message}", e)
    }
  }

  override fun saveMeshNetwork(promise: Promise) {
    try {
      val networkData = currentMeshInfo?.toJson() ?: "{}"
      promise.resolve(networkData)
    } catch (e: Exception) {
      promise.reject("NETWORK_SAVE_ERROR", "Failed to save mesh network: ${e.message}", e)
    }
  }

  override fun clearMeshNetwork(promise: Promise) {
    try {
      meshService?.clear()
      currentMeshInfo = null
      discoveredDevices.clear()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("NETWORK_CLEAR_ERROR", "Failed to clear mesh network: ${e.message}", e)
    }
  }

  // Device Scanning
  override fun startScanning(filters: ReadableMap?, promise: Promise) {
    try {
      if (!checkBluetoothPermissions()) {
        promise.reject("PERMISSION_DENIED", "Bluetooth permissions not granted")
        return
      }

      if (!isBluetoothEnabled()) {
        promise.reject("BLUETOOTH_DISABLED", "Bluetooth is not enabled")
        return
      }

      val scanParams = ScanParameters().apply {
        scanDuration = filters?.getInt("duration") ?: 30000 // Default 30 seconds
        // Add other scan parameters as needed
      }

      discoveredDevices.clear()
      isScanning = true
      
      meshService?.startScan(scanParams)
      
      // Send scan started event
      sendEvent("scanStarted", Arguments.createMap())
      
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCAN_ERROR", "Failed to start scanning: ${e.message}", e)
    }
  }

  override fun stopScanning(promise: Promise) {
    try {
      meshService?.stopScan()
      isScanning = false
      
      // Send scan stopped event
      sendEvent("scanStopped", Arguments.createMap())
      
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCAN_ERROR", "Failed to stop scanning: ${e.message}", e)
    }
  }

  override fun getDiscoveredDevices(promise: Promise) {
    try {
      val devices = Arguments.createArray()
      discoveredDevices.forEach { device ->
        devices.pushMap(device)
      }
      promise.resolve(devices)
    } catch (e: Exception) {
      promise.reject("GET_DEVICES_ERROR", "Failed to get discovered devices: ${e.message}", e)
    }
  }

  // Device Provisioning
  override fun startProvisioning(device: ReadableMap, config: ReadableMap, promise: Promise) {
    try {
      val deviceAddress = device.getString("address") ?: throw Exception("Device address is required")
      val deviceUuid = device.getMap("advertisementData")?.getString("deviceUuid") ?: deviceAddress
      val unicastAddress = config.getInt("unicastAddress")
      val networkKeyIndex = config.getInt("networkKeyIndex")
      val flags = config.getInt("flags")
      val ivIndex = config.getInt("ivIndex")
      val attentionDuration = if (config.hasKey("attentionDuration")) config.getInt("attentionDuration") else 0

      // Send provisioning started event
      val startedEvent = Arguments.createMap().apply {
        putString("deviceUuid", deviceUuid)
        putInt("unicastAddress", unicastAddress)
      }
      sendEvent("provisioningStarted", startedEvent)

      // Create provisioning parameters
      val provisioningParams = ProvisioningParameters().apply {
        this.unicastAddress = unicastAddress
        this.networkKeyIndex = networkKeyIndex
        this.ivIndex = ivIndex
        this.flags = flags
        this.attentionDuration = attentionDuration
      }

      // Start provisioning process with callbacks
      meshService?.startProvisioning(deviceAddress, provisioningParams, object : ProvisioningCallback {
        override fun onProgress(step: String, progress: Int) {
          // Send provisioning progress event
          val progressEvent = Arguments.createMap().apply {
            putString("step", step)
            putInt("progress", progress)
            putString("deviceUuid", deviceUuid)
            putInt("nodeAddress", unicastAddress)
            putString("message", "Provisioning in progress: $step")
          }
          sendEvent("provisioningProgress", progressEvent)
        }

        override fun onSuccess(nodeAddress: Int, deviceKey: ByteArray, uuid: ByteArray) {
          // Get composition data if available
          val node = currentMeshInfo?.getDeviceByMeshAddress(nodeAddress)

          val result = Arguments.createMap().apply {
            putBoolean("success", true)
            putInt("nodeAddress", nodeAddress)
            putString("deviceKey", UnitConvert.bytes2HexString(deviceKey))
            putString("uuid", UnitConvert.bytes2HexString(uuid))
          }

          // Send provisioning completed event
          val completedEvent = Arguments.createMap().apply {
            putString("deviceUuid", deviceUuid)
            putInt("nodeAddress", nodeAddress)
          }
          sendEvent("provisioningCompleted", completedEvent)

          promise.resolve(result)
        }

        override fun onFailure(error: String) {
          // Send provisioning failed event
          val failedEvent = Arguments.createMap().apply {
            putString("deviceUuid", deviceUuid)
            putString("error", error)
          }
          sendEvent("provisioningFailed", failedEvent)

          promise.reject("PROVISIONING_ERROR", "Provisioning failed: $error")
        }
      })

    } catch (e: Exception) {
      // Send provisioning failed event
      val failedEvent = Arguments.createMap().apply {
        putString("error", e.message ?: "Unknown error")
      }
      sendEvent("provisioningFailed", failedEvent)

      promise.reject("PROVISIONING_ERROR", "Failed to start provisioning: ${e.message}", e)
    }
  }

  override fun cancelProvisioning(promise: Promise) {
    try {
      meshService?.stopProvisioning()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("PROVISIONING_ERROR", "Failed to cancel provisioning: ${e.message}", e)
    }
  }

  override fun startFastProvisioning(devices: ReadableArray, startAddress: Double, promise: Promise) {
    try {
      val devicesList = mutableListOf<ReadableMap>()
      for (i in 0 until devices.size()) {
        devices.getMap(i)?.let { devicesList.add(it) }
      }

      if (devicesList.isEmpty()) {
        promise.reject("PROVISIONING_ERROR", "No devices provided for fast provisioning")
        return
      }

      val results = Arguments.createArray()
      var currentAddress = startAddress.toInt()
      var provisionedCount = 0
      val totalDevices = devicesList.size

      // Fast provision devices sequentially
      fun provisionNextDevice(index: Int) {
        if (index >= devicesList.size) {
          // All devices processed
          promise.resolve(results)
          return
        }

        val device = devicesList[index]
        val deviceAddress = device.getString("address") ?: ""
        val deviceUuid = device.getMap("advertisementData")?.getString("deviceUuid") ?: deviceAddress

        // Send progress event for fast provisioning
        val progressEvent = Arguments.createMap().apply {
          putString("step", "Fast provisioning device ${index + 1}/$totalDevices")
          putInt("progress", ((index.toFloat() / totalDevices) * 100).toInt())
          putString("deviceUuid", deviceUuid)
          putInt("nodeAddress", currentAddress)
        }
        sendEvent("provisioningProgress", progressEvent)

        // Create provisioning parameters for this device
        val provisioningParams = ProvisioningParameters().apply {
          this.unicastAddress = currentAddress
          this.networkKeyIndex = 0
          this.ivIndex = currentMeshInfo?.ivIndex ?: 0
          this.flags = 0
          this.attentionDuration = 0
        }

        // Start provisioning for current device
        meshService?.startProvisioning(deviceAddress, provisioningParams, object : ProvisioningCallback {
          override fun onProgress(step: String, progress: Int) {
            // Progress events are handled by individual provisioning
          }

          override fun onSuccess(nodeAddress: Int, deviceKey: ByteArray, uuid: ByteArray) {
            val result = Arguments.createMap().apply {
              putBoolean("success", true)
              putInt("nodeAddress", nodeAddress)
              putString("deviceKey", UnitConvert.bytes2HexString(deviceKey))
              putString("uuid", UnitConvert.bytes2HexString(uuid))
            }
            results.pushMap(result)
            provisionedCount++

            // Provision next device
            currentAddress++
            provisionNextDevice(index + 1)
          }

          override fun onFailure(error: String) {
            val result = Arguments.createMap().apply {
              putBoolean("success", false)
              putString("error", error)
              putString("uuid", deviceUuid)
            }
            results.pushMap(result)

            // Continue with next device even if this one failed
            currentAddress++
            provisionNextDevice(index + 1)
          }
        })
      }

      // Start provisioning first device
      provisionNextDevice(0)

    } catch (e: Exception) {
      promise.reject("PROVISIONING_ERROR", "Failed to start fast provisioning: ${e.message}", e)
    }
  }

  // Device Control
  override fun sendGenericOnOff(address: Double, isOn: Boolean, transitionTime: Double?, promise: Promise) {
    try {
      val nodeAddress = address.toInt()
      val transition = transitionTime?.toInt() ?: 0
      
      // Send Generic OnOff command
      meshService?.sendGenericOnOffSet(nodeAddress, isOn, transition)
      
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("COMMAND_ERROR", "Failed to send OnOff command: ${e.message}", e)
    }
  }

  override fun sendGenericLevel(address: Double, level: Double, transitionTime: Double?, promise: Promise) {
    try {
      val nodeAddress = address.toInt()
      val levelValue = (level * 655.35).toInt() // Convert 0-100 to 0-65535
      val transition = transitionTime?.toInt() ?: 0
      
      // Send Generic Level command
      meshService?.sendGenericLevelSet(nodeAddress, levelValue, transition)
      
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("COMMAND_ERROR", "Failed to send Level command: ${e.message}", e)
    }
  }

  override fun sendColorHSL(address: Double, hue: Double, saturation: Double, lightness: Double, transitionTime: Double?, promise: Promise) {
    try {
      val nodeAddress = address.toInt()
      val hueValue = (hue * 182.04).toInt() // Convert 0-360 to 0-65535
      val satValue = (saturation * 655.35).toInt() // Convert 0-100 to 0-65535
      val lightValue = (lightness * 655.35).toInt() // Convert 0-100 to 0-65535
      val transition = transitionTime?.toInt() ?: 0
      
      // Send Light HSL command
      meshService?.sendLightHSLSet(nodeAddress, hueValue, satValue, lightValue, transition)
      
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("COMMAND_ERROR", "Failed to send Color command: ${e.message}", e)
    }
  }

  // Group Management
  override fun createGroup(groupAddress: Double, name: String, promise: Promise) {
    try {
      val groupAddr = groupAddress.toInt()
      currentMeshInfo?.addGroup(groupAddr, name)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("GROUP_ERROR", "Failed to create group: ${e.message}", e)
    }
  }

  override fun addDeviceToGroup(nodeAddress: Double, groupAddress: Double, promise: Promise) {
    try {
      val nodeAddr = nodeAddress.toInt()
      val groupAddr = groupAddress.toInt()
      
      // Add device to group subscription
      meshService?.addDeviceToGroup(nodeAddr, groupAddr)
      
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("GROUP_ERROR", "Failed to add device to group: ${e.message}", e)
    }
  }

  override fun removeDeviceFromGroup(nodeAddress: Double, groupAddress: Double, promise: Promise) {
    try {
      val nodeAddr = nodeAddress.toInt()
      val groupAddr = groupAddress.toInt()

      // Remove device from group subscription
      meshService?.removeDeviceFromGroup(nodeAddr, groupAddr)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("GROUP_ERROR", "Failed to remove device from group: ${e.message}", e)
    }
  }

  override fun sendGroupCommand(groupAddress: Double, isOn: Boolean, transitionTime: Double?, promise: Promise) {
    try {
      val groupAddr = groupAddress.toInt()
      val transition = transitionTime?.toInt() ?: 0

      // Send command to all devices in group
      meshService?.sendGenericOnOffSet(groupAddr, isOn, transition)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("GROUP_ERROR", "Failed to send group command: ${e.message}", e)
    }
  }

  // Scene Control
  override fun sendSceneStore(address: Double, sceneId: Double, promise: Promise) {
    try {
      val nodeAddr = address.toInt()
      val sceneNumber = sceneId.toInt()

      // Send Scene Store command
      meshService?.sendSceneStore(nodeAddr, sceneNumber)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCENE_ERROR", "Failed to store scene: ${e.message}", e)
    }
  }

  override fun sendSceneRecall(address: Double, sceneId: Double, promise: Promise) {
    try {
      val nodeAddr = address.toInt()
      val sceneNumber = sceneId.toInt()

      // Send Scene Recall command
      meshService?.sendSceneRecall(nodeAddr, sceneNumber)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCENE_ERROR", "Failed to recall scene: ${e.message}", e)
    }
  }

  override fun sendSceneDelete(address: Double, sceneId: Double, promise: Promise) {
    try {
      val nodeAddr = address.toInt()
      val sceneNumber = sceneId.toInt()

      // Send Scene Delete command
      meshService?.sendSceneDelete(nodeAddr, sceneNumber)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCENE_ERROR", "Failed to delete scene: ${e.message}", e)
    }
  }

  override fun sendSceneRegisterGet(address: Double, promise: Promise) {
    try {
      val nodeAddr = address.toInt()

      // Send Scene Register Get command and retrieve stored scenes
      meshService?.sendSceneRegisterGet(nodeAddr) { scenes ->
        val sceneArray = Arguments.createArray()
        scenes.forEach { sceneId ->
          sceneArray.pushInt(sceneId)
        }
        promise.resolve(sceneArray)
      }
    } catch (e: Exception) {
      promise.reject("SCENE_ERROR", "Failed to get scene register: ${e.message}", e)
    }
  }

  // Network Information
  override fun getAllNodes(promise: Promise) {
    try {
      val nodes = Arguments.createArray()
      currentMeshInfo?.nodes?.forEach { node ->
        val nodeMap = Arguments.createMap().apply {
          putInt("unicastAddress", node.meshAddress)
          putString("deviceKey", UnitConvert.bytes2HexString(node.deviceKey))
          putString("uuid", UnitConvert.bytes2HexString(node.deviceUUID))
          putString("name", node.name ?: "Unknown Device")
          putBoolean("isOnline", node.isOnline)
        }
        nodes.pushMap(nodeMap)
      }
      promise.resolve(nodes)
    } catch (e: Exception) {
      promise.reject("GET_NODES_ERROR", "Failed to get nodes: ${e.message}", e)
    }
  }

  override fun getNodeInfo(nodeAddress: Double, promise: Promise) {
    try {
      val addr = nodeAddress.toInt()
      val node = currentMeshInfo?.getDeviceByMeshAddress(addr)
      
      if (node != null) {
        val nodeMap = Arguments.createMap().apply {
          putInt("unicastAddress", node.meshAddress)
          putString("deviceKey", UnitConvert.bytes2HexString(node.deviceKey))
          putString("uuid", UnitConvert.bytes2HexString(node.deviceUUID))
          putString("name", node.name ?: "Unknown Device")
          putBoolean("isOnline", node.isOnline)
        }
        promise.resolve(nodeMap)
      } else {
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject("GET_NODE_ERROR", "Failed to get node info: ${e.message}", e)
    }
  }

  // Utility methods
  override fun checkBluetoothPermission(promise: Promise) {
    promise.resolve(checkBluetoothPermissions())
  }

  override fun requestBluetoothPermission(promise: Promise) {
    // This would typically trigger a permission request
    // For now, just return current permission status
    promise.resolve(checkBluetoothPermissions())
  }

  override fun isBluetoothEnabled(promise: Promise) {
    promise.resolve(isBluetoothEnabled())
  }

  // Event listeners (required by TurboModule spec)
  override fun addListener(eventName: String) {
    // Event listeners are handled by React Native's EventEmitter
  }

  override fun removeListeners(count: Double) {
    // Event listeners are handled by React Native's EventEmitter
  }

  // Private helper methods
  private fun checkBluetoothPermissions(): Boolean {
    val context = reactApplicationContext
    return ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED &&
           ContextCompat.checkSelfPermission(context, android.Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
           ContextCompat.checkSelfPermission(context, android.Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
  }

  private fun isBluetoothEnabled(): Boolean {
    val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    return bluetoothManager.adapter?.isEnabled == true
  }

  private fun sendEvent(eventName: String, params: WritableMap) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private fun setupEventHandlers() {
    // Set up event handlers for mesh service callbacks
    // This would be implemented based on the specific event system of TelinkBleMeshLib
  }

  // Lifecycle events
  override fun onHostResume() {
    // Handle app resume
  }

  override fun onHostPause() {
    // Handle app pause
  }

  override fun onHostDestroy() {
    // Clean up resources
    meshService?.clear()
  }

  companion object {
    const val NAME = "TelinkBle"
  }
}
