#import <React/RCTBridgeModule.h>
#import "TelinkBle.h"

@implementation TelinkBle

+ (BOOL)requiresMainQueueSetup
{
    return true;
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[];
}

@end
