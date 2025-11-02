#import <TelinkBleSpec/TelinkBleSpec.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <TelinkBleSpec/TelinkBleSpec.h>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#endif

@interface TelinkBle : RCTEventEmitter <NativeTelinkBleSpec>

@end
