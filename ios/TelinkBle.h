#import <TelinkBleSpec/TelinkBleSpec.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <TelinkBleSpec/TelinkBleSpec.h>
#else
#import <React/RCTBridgeModule.h>
#endif

@interface TelinkBle : NSObject <NativeTelinkBleSpec>

@end
