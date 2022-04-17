//
//  TelinkBle+SigMeshDelegate.m
//  TelinkBle
//
//  Created by Thanh Tùng on 17/04/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "TelinkBle+SigMeshDelegate.h"

@implementation TelinkBle (SigMessageDelegate)

- (void)didReceiveMessage:(SigMeshMessage *)message sentFromSource:(UInt16)source toDestination:(UInt16)destination
{
    //
}

- (void)didSendMessage:(SigMeshMessage *)message fromLocalElement:(SigElementModel *)localElement toDestination:(UInt16)destination
{
    //
}

- (void)failedToSendMessage:(SigMeshMessage *)message fromLocalElement:(SigElementModel *)localElement toDestination:(UInt16)destination error:(NSError *)error
{
    //
}

- (void)didReceiveSigProxyConfigurationMessage:(SigProxyConfigurationMessage *)message sentFromSource:(UInt16)source toDestination:(UInt16)destination
{
    //
}

@end
