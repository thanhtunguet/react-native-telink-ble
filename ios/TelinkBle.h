//
//  TelinkBle.h
//  TelinkBle
//
//  Created by Thanh Tùng on 17/04/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//

#ifndef TelinkBle_h
#define TelinkBle_h

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <TelinkSigMeshLib/TelinkSigMeshLib.h>
#import "BleEvent.h"

#define kShareWithBluetoothPointToPoint (YES)
#define kShowScenes                     (YES)
#define kShowDebug                      (NO)
#define kshowLog                        (YES)
#define kshowShare                      (YES)
#define kshowMeshInfo                   (YES)
#define kshowChooseAdd                  (YES)

#define kKeyBindType                        @"kKeyBindType"
#define kRemoteAddType                      @"kRemoteAddType"
#define kFastAddType                        @"kFastAddType"
#define kDLEType                            @"kDLEType"
#define kGetOnlineStatusType                @"kGetOnlineStatusType"
#define kAddStaticOOBDevcieByNoOOBEnable    @"kAddStaticOOBDevcieByNoOOBEnable"
#define KeyBindType                         @"kKeyBindType"
#define kDLEUnsegmentLength                 (229)

@interface TelinkBle : RCTEventEmitter<RCTBridgeModule, SigMessageDelegate>

@property(strong, nonatomic) NSMutableArray<AddDeviceModel *> *_Nonnull source;

@end

#endif /* TelinkBle_h */
