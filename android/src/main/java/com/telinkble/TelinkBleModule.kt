package com.telinkble

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.telink.ble.mesh.foundation.MeshService

@ReactModule(name = TelinkBleModule.NAME)
class TelinkBleModule(reactContext: ReactApplicationContext) :
  NativeTelinkBleSpec(reactContext) {

  private var meshService: MeshService? = null

  override fun getName(): String {
    return NAME
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = "TelinkBle"
  }
}
