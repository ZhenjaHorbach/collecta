package com.collecta.turboimage

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class CollectaTurboImagePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == CollectaTurboImageModule.NAME) CollectaTurboImageModule(reactContext) else null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        CollectaTurboImageModule.NAME to ReactModuleInfo(
          CollectaTurboImageModule.NAME,
          CollectaTurboImageModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          true   // isTurboModule
        )
      )
    }
  }
}
