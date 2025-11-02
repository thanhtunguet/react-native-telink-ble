#import "TelinkBle.h"
#import <TelinkSigMeshLib/TelinkSigMeshLib.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>

@interface TelinkBle() <SigMessageDelegate, SigBearerDataDelegate, SigScanDelegate>
@property (nonatomic, strong) SigDataSource *dataSource;
@property (nonatomic, strong) NSMutableArray<NSDictionary *> *discoveredDevices;
@property (nonatomic, assign) BOOL isScanning;
@property (nonatomic, assign) BOOL hasListeners;
@end

@implementation TelinkBle

+ (NSString *)moduleName
{
    return @"TelinkBle";
}

- (instancetype)init
{
    self = [super init];
    if (self) {
        self.discoveredDevices = [NSMutableArray array];
        self.isScanning = NO;
        self.hasListeners = NO;
        [self setupMeshLib];
    }
    return self;
}

- (void)setupMeshLib
{
    // Initialize the SigMeshLib
    [SigMeshLib share];
    [[SigMeshLib share] setDelegateForDeveloper:self];
    [[SigMeshLib share].dataSource.scanList removeAllObjects];
}

// Legacy method for compatibility
- (NSNumber *)multiply:(double)a b:(double)b {
    NSNumber *result = @(a * b);
    return result;
}

// Network Management
- (void)initializeMeshNetwork:(NSDictionary *)config
                     resolver:(RCTPromiseResolveBlock)resolve
                     rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        NSString *networkName = config[@"networkName"] ?: @"DefaultNetwork";
        NSString *networkKey = config[@"networkKey"];
        NSString *appKey = config[@"appKey"];
        NSNumber *ivIndex = config[@"ivIndex"];
        NSNumber *sequenceNumber = config[@"sequenceNumber"];
        
        if (!networkKey || !appKey) {
            reject(@"NETWORK_INIT_ERROR", @"Network key and app key are required", nil);
            return;
        }
        
        // Create new mesh network
        self.dataSource = [[SigDataSource alloc] init];
        [self.dataSource configData];
        
        // Set network configuration
        self.dataSource.meshName = networkName;
        self.dataSource.meshUUID = [LibTools convertDataToHexStr:[LibTools createNetworkId]];
        
        // Set network key
        SigNetkeyModel *netkey = [[SigNetkeyModel alloc] init];
        netkey.index = 0;
        netkey.key = networkKey;
        [self.dataSource.netKeys removeAllObjects];
        [self.dataSource.netKeys addObject:netkey];
        
        // Set app key
        SigAppkeyModel *appkey = [[SigAppkeyModel alloc] init];
        appkey.index = 0;
        appkey.boundNetKey = 0;
        appkey.key = appKey;
        [self.dataSource.appKeys removeAllObjects];
        [self.dataSource.appKeys addObject:appkey];
        
        // Set IV index and sequence number
        self.dataSource.ivIndex = [ivIndex unsignedIntValue];
        self.dataSource.sequenceNumber = [sequenceNumber unsignedIntValue];
        
        // Apply configuration
        [SigMeshLib share].dataSource = self.dataSource;
        [[SigMeshLib share] saveLocationData];
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"NETWORK_INIT_ERROR", [NSString stringWithFormat:@"Failed to initialize mesh network: %@", exception.reason], nil);
    }
}

- (void)loadMeshNetwork:(NSString *)networkData
               resolver:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        // Parse and load existing mesh network data
        NSData *data = [networkData dataUsingEncoding:NSUTF8StringEncoding];
        NSError *error;
        NSDictionary *networkDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
        
        if (error) {
            reject(@"NETWORK_LOAD_ERROR", [NSString stringWithFormat:@"Failed to parse network data: %@", error.localizedDescription], error);
            return;
        }
        
        // Create data source from parsed data
        self.dataSource = [[SigDataSource alloc] initWithDictionary:networkDict];
        [SigMeshLib share].dataSource = self.dataSource;
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"NETWORK_LOAD_ERROR", [NSString stringWithFormat:@"Failed to load mesh network: %@", exception.reason], nil);
    }
}

- (void)saveMeshNetwork:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        NSDictionary *networkDict = [self.dataSource getDictionaryOfDataSource];
        NSError *error;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:networkDict options:0 error:&error];
        
        if (error) {
            reject(@"NETWORK_SAVE_ERROR", [NSString stringWithFormat:@"Failed to serialize network data: %@", error.localizedDescription], error);
            return;
        }
        
        NSString *networkData = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        resolve(networkData);
    } @catch (NSException *exception) {
        reject(@"NETWORK_SAVE_ERROR", [NSString stringWithFormat:@"Failed to save mesh network: %@", exception.reason], nil);
    }
}

- (void)clearMeshNetwork:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        [self.dataSource.nodes removeAllObjects];
        [self.dataSource.groups removeAllObjects];
        [self.dataSource.scenes removeAllObjects];
        [self.discoveredDevices removeAllObjects];
        [[SigMeshLib share] cleanData];
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"NETWORK_CLEAR_ERROR", [NSString stringWithFormat:@"Failed to clear mesh network: %@", exception.reason], nil);
    }
}

// Device Scanning
- (void)startScanning:(NSDictionary *)filters
             resolver:(RCTPromiseResolveBlock)resolve
             rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        NSNumber *duration = filters[@"duration"] ?: @30000; // Default 30 seconds
        NSNumber *rssiThreshold = filters[@"rssiThreshold"] ?: @(-80);
        
        [self.discoveredDevices removeAllObjects];
        self.isScanning = YES;
        
        // Start BLE scanning
        [[SigBluetooth share] scanUnprovisionedDevicesWithResult:^(CBPeripheral * _Nonnull peripheral, NSDictionary<NSString *,id> * _Nonnull advertisementData, NSNumber * _Nonnull RSSI) {
            if ([RSSI intValue] >= [rssiThreshold intValue]) {
                [self onDeviceFound:peripheral advertisementData:advertisementData RSSI:RSSI];
            }
        }];
        
        // Send scan started event
        if (self.hasListeners) {
            [self sendEventWithName:@"scanStarted" body:@{}];
        }
        
        // Auto-stop scanning after duration
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, [duration doubleValue] * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
            if (self.isScanning) {
                [self stopScanningWithResolver:^(id result) {} rejecter:^(NSString *code, NSString *message, NSError *error) {}];
            }
        });
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"SCAN_ERROR", [NSString stringWithFormat:@"Failed to start scanning: %@", exception.reason], nil);
    }
}

- (void)stopScanning:(RCTPromiseResolveBlock)resolve
            rejecter:(RCTPromiseRejectBlock)reject
{
    [self stopScanningWithResolver:resolve rejecter:reject];
}

- (void)stopScanningWithResolver:(RCTPromiseResolveBlock)resolve
                        rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        [[SigBluetooth share] stopScan];
        self.isScanning = NO;
        
        // Send scan stopped event
        if (self.hasListeners) {
            [self sendEventWithName:@"scanStopped" body:@{}];
        }
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"SCAN_ERROR", [NSString stringWithFormat:@"Failed to stop scanning: %@", exception.reason], nil);
    }
}

- (void)getDiscoveredDevices:(RCTPromiseResolveBlock)resolve
                    rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        resolve(self.discoveredDevices);
    } @catch (NSException *exception) {
        reject(@"GET_DEVICES_ERROR", [NSString stringWithFormat:@"Failed to get discovered devices: %@", exception.reason], nil);
    }
}

// Device Provisioning
- (void)startProvisioning:(NSDictionary *)device
                   config:(NSDictionary *)config
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        NSString *deviceAddress = device[@"address"];
        NSString *deviceUuid = device[@"advertisementData"][@"deviceUuid"] ?: deviceAddress;
        NSNumber *unicastAddress = config[@"unicastAddress"];

        if (!deviceAddress || !unicastAddress) {
            reject(@"PROVISIONING_ERROR", @"Device address and unicast address are required", nil);
            return;
        }

        // Send provisioning started event
        if (self.hasListeners) {
            [self sendEventWithName:@"provisioningStarted" body:@{
                @"deviceUuid": deviceUuid,
                @"unicastAddress": unicastAddress
            }];
        }

        // Find peripheral by address
        CBPeripheral *peripheral = [self findPeripheralByAddress:deviceAddress];
        if (!peripheral) {
            reject(@"PROVISIONING_ERROR", @"Device not found", nil);
            return;
        }

        // Send initial progress event
        if (self.hasListeners) {
            [self sendEventWithName:@"provisioningProgress" body:@{
                @"step": @"Connecting to device",
                @"progress": @10,
                @"deviceUuid": deviceUuid,
                @"nodeAddress": unicastAddress
            }];
        }

        // Start provisioning
        [[SigAddDeviceManager share] startAddDeviceWithNextAddress:[unicastAddress unsignedShortValue]
                                                       peripheral:peripheral
                                                   provisionType:ProvisionType_NoOOB
                                                     unicastAddress:[unicastAddress unsignedShortValue]
                                                         uuid:nil
                                                     keyBindType:KeyBindType_Normal
                                                   productID:0
                                                   cpsData:nil
                                                      isAutoAddNextDevice:NO
                                                      provisionSuccess:^(NSString * _Nonnull identify, UInt16 address) {
            // Send provision progress
            if (self.hasListeners) {
                [self sendEventWithName:@"provisioningProgress" body:@{
                    @"step": @"Device provisioned successfully",
                    @"progress": @90,
                    @"deviceUuid": deviceUuid,
                    @"nodeAddress": @(address)
                }];
            }

            // Get device key from data source
            SigNodeModel *node = [self.dataSource getNodeWithAddress:address];
            NSString *deviceKey = node ? node.deviceKey : @"";

            // Provisioning success
            NSDictionary *result = @{
                @"success": @YES,
                @"nodeAddress": @(address),
                @"deviceKey": deviceKey,
                @"uuid": identify ?: @""
            };

            // Send provisioning completed event
            if (self.hasListeners) {
                [self sendEventWithName:@"provisioningCompleted" body:@{
                    @"deviceUuid": identify,
                    @"nodeAddress": @(address)
                }];
            }

            resolve(result);
        } provisionFail:^(NSError * _Nonnull error) {
            // Send provisioning failed event
            if (self.hasListeners) {
                [self sendEventWithName:@"provisioningFailed" body:@{
                    @"deviceUuid": deviceUuid,
                    @"error": error.localizedDescription
                }];
            }

            // Provisioning failed
            reject(@"PROVISIONING_ERROR", [NSString stringWithFormat:@"Provisioning failed: %@", error.localizedDescription], error);
        } keyBindSuccess:^(NSString * _Nonnull identify, UInt16 address) {
            // Send key bind progress
            if (self.hasListeners) {
                [self sendEventWithName:@"provisioningProgress" body:@{
                    @"step": @"Binding application keys",
                    @"progress": @95,
                    @"deviceUuid": deviceUuid,
                    @"nodeAddress": @(address)
                }];
            }
        } keyBindFail:^(NSError * _Nonnull error) {
            // Key binding failed - this might not be critical
            NSLog(@"Key binding failed: %@", error.localizedDescription);
        }];

    } @catch (NSException *exception) {
        // Send provisioning failed event
        if (self.hasListeners) {
            [self sendEventWithName:@"provisioningFailed" body:@{
                @"error": exception.reason
            }];
        }

        reject(@"PROVISIONING_ERROR", [NSString stringWithFormat:@"Failed to start provisioning: %@", exception.reason], nil);
    }
}

- (void)cancelProvisioning:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        [[SigAddDeviceManager share] stopAddDevice];
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"PROVISIONING_ERROR", [NSString stringWithFormat:@"Failed to cancel provisioning: %@", exception.reason], nil);
    }
}

- (void)startFastProvisioning:(NSArray *)devices
                 startAddress:(double)startAddress
                     resolver:(RCTPromiseResolveBlock)resolve
                     rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        if (devices.count == 0) {
            reject(@"PROVISIONING_ERROR", @"No devices provided for fast provisioning", nil);
            return;
        }

        NSMutableArray *results = [NSMutableArray array];
        __block UInt16 currentAddress = (UInt16)startAddress;
        __block NSUInteger deviceIndex = 0;
        NSUInteger totalDevices = devices.count;

        // Recursive provisioning function
        void (^provisionNextDevice)(void) = ^{
            if (deviceIndex >= devices.count) {
                // All devices processed
                resolve(results);
                return;
            }

            NSDictionary *device = devices[deviceIndex];
            NSString *deviceAddress = device[@"address"];
            NSString *deviceUuid = device[@"advertisementData"][@"deviceUuid"] ?: deviceAddress;

            // Send progress event
            if (self.hasListeners) {
                [self sendEventWithName:@"provisioningProgress" body:@{
                    @"step": [NSString stringWithFormat:@"Fast provisioning device %lu/%lu", (unsigned long)(deviceIndex + 1), (unsigned long)totalDevices],
                    @"progress": @((deviceIndex * 100) / totalDevices),
                    @"deviceUuid": deviceUuid,
                    @"nodeAddress": @(currentAddress)
                }];
            }

            // Find peripheral
            CBPeripheral *peripheral = [self findPeripheralByAddress:deviceAddress];
            if (!peripheral) {
                // Add failed result
                [results addObject:@{
                    @"success": @NO,
                    @"error": @"Device not found",
                    @"uuid": deviceUuid
                }];
                deviceIndex++;
                currentAddress++;
                provisionNextDevice();
                return;
            }

            // Start provisioning for current device
            [[SigAddDeviceManager share] startAddDeviceWithNextAddress:currentAddress
                                                           peripheral:peripheral
                                                       provisionType:ProvisionType_NoOOB
                                                         unicastAddress:currentAddress
                                                             uuid:nil
                                                         keyBindType:KeyBindType_Fast
                                                       productID:0
                                                       cpsData:nil
                                                          isAutoAddNextDevice:NO
                                                          provisionSuccess:^(NSString * _Nonnull identify, UInt16 address) {
                // Get device key
                SigNodeModel *node = [self.dataSource getNodeWithAddress:address];
                NSString *deviceKey = node ? node.deviceKey : @"";

                // Add success result
                [results addObject:@{
                    @"success": @YES,
                    @"nodeAddress": @(address),
                    @"deviceKey": deviceKey,
                    @"uuid": identify ?: @""
                }];

                // Provision next device
                deviceIndex++;
                currentAddress++;
                provisionNextDevice();
            } provisionFail:^(NSError * _Nonnull error) {
                // Add failed result
                [results addObject:@{
                    @"success": @NO,
                    @"error": error.localizedDescription,
                    @"uuid": deviceUuid
                }];

                // Continue with next device
                deviceIndex++;
                currentAddress++;
                provisionNextDevice();
            } keyBindSuccess:^(NSString * _Nonnull identify, UInt16 address) {
                // Key binding success
            } keyBindFail:^(NSError * _Nonnull error) {
                // Key binding failed - not critical for fast provisioning
            }];
        };

        // Start provisioning first device
        provisionNextDevice();

    } @catch (NSException *exception) {
        reject(@"PROVISIONING_ERROR", [NSString stringWithFormat:@"Failed to start fast provisioning: %@", exception.reason], nil);
    }
}

// Device Control
- (void)sendGenericOnOff:(double)address
                    isOn:(BOOL)isOn
          transitionTime:(NSNumber *)transitionTime
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddress = (UInt16)address;
        UInt8 transition = transitionTime ? [transitionTime unsignedCharValue] : 0;
        
        SigGenericOnOffSet *message = [[SigGenericOnOffSet alloc] initWithOnOff:isOn transitionTime:transition delay:0];
        
        [[SDKLibCommand share] genericOnOffSetWithDestination:nodeAddress 
                                                     onOffSet:message 
                                                   retryCount:2 
                                              responseMaxCount:1 
                                                  successCallback:^(UInt16 source, UInt16 destination, SigGenericOnOffStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"COMMAND_ERROR", [NSString stringWithFormat:@"Failed to send OnOff command: %@", error.localizedDescription], error);
            }
        }];
        
    } @catch (NSException *exception) {
        reject(@"COMMAND_ERROR", [NSString stringWithFormat:@"Failed to send OnOff command: %@", exception.reason], nil);
    }
}

- (void)sendGenericLevel:(double)address
                   level:(double)level
          transitionTime:(NSNumber *)transitionTime
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddress = (UInt16)address;
        SInt16 levelValue = (SInt16)(level * 655.35); // Convert 0-100 to 0-65535
        UInt8 transition = transitionTime ? [transitionTime unsignedCharValue] : 0;
        
        SigGenericLevelSet *message = [[SigGenericLevelSet alloc] initWithLevel:levelValue transitionTime:transition delay:0];
        
        [[SDKLibCommand share] genericLevelSetWithDestination:nodeAddress 
                                                     levelSet:message 
                                                   retryCount:2 
                                              responseMaxCount:1 
                                                  successCallback:^(UInt16 source, UInt16 destination, SigGenericLevelStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"COMMAND_ERROR", [NSString stringWithFormat:@"Failed to send Level command: %@", error.localizedDescription], error);
            }
        }];
        
    } @catch (NSException *exception) {
        reject(@"COMMAND_ERROR", [NSString stringWithFormat:@"Failed to send Level command: %@", exception.reason], nil);
    }
}

- (void)sendColorHSL:(double)address
                 hue:(double)hue
          saturation:(double)saturation
           lightness:(double)lightness
      transitionTime:(NSNumber *)transitionTime
            resolver:(RCTPromiseResolveBlock)resolve
            rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddress = (UInt16)address;
        UInt16 hueValue = (UInt16)(hue * 182.04); // Convert 0-360 to 0-65535
        UInt16 satValue = (UInt16)(saturation * 655.35); // Convert 0-100 to 0-65535
        UInt16 lightValue = (UInt16)(lightness * 655.35); // Convert 0-100 to 0-65535
        UInt8 transition = transitionTime ? [transitionTime unsignedCharValue] : 0;
        
        SigLightHSLSet *message = [[SigLightHSLSet alloc] initWithHSLHue:hueValue HSLSaturation:satValue HSLLightness:lightValue transitionTime:transition delay:0];
        
        [[SDKLibCommand share] lightHSLSetWithDestination:nodeAddress 
                                                  HSLSet:message 
                                              retryCount:2 
                                         responseMaxCount:1 
                                             successCallback:^(UInt16 source, UInt16 destination, SigLightHSLStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"COMMAND_ERROR", [NSString stringWithFormat:@"Failed to send Color command: %@", error.localizedDescription], error);
            }
        }];
        
    } @catch (NSException *exception) {
        reject(@"COMMAND_ERROR", [NSString stringWithFormat:@"Failed to send Color command: %@", exception.reason], nil);
    }
}

// Group Management
- (void)createGroup:(double)groupAddress
               name:(NSString *)name
           resolver:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 groupAddr = (UInt16)groupAddress;
        SigGroupModel *group = [[SigGroupModel alloc] init];
        group.address = groupAddr;
        group.name = name;
        
        [self.dataSource.groups addObject:group];
        [[SigMeshLib share] saveLocationData];
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"GROUP_ERROR", [NSString stringWithFormat:@"Failed to create group: %@", exception.reason], nil);
    }
}

- (void)addDeviceToGroup:(double)nodeAddress
            groupAddress:(double)groupAddress
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddr = (UInt16)nodeAddress;
        UInt16 groupAddr = (UInt16)groupAddress;
        
        // Add device to group subscription
        [[SDKLibCommand share] configModelSubscriptionAddWithDestination:nodeAddr 
                                                           subscriptionAdd:[[SigConfigModelSubscriptionAdd alloc] initWithElementAddress:nodeAddr address:groupAddr modelIdentifier:SigModelID_GenericOnOffServer] 
                                                                retryCount:2 
                                                           responseMaxCount:1 
                                                               successCallback:^(UInt16 source, UInt16 destination, SigConfigModelSubscriptionStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"GROUP_ERROR", [NSString stringWithFormat:@"Failed to add device to group: %@", error.localizedDescription], error);
            }
        }];
        
    } @catch (NSException *exception) {
        reject(@"GROUP_ERROR", [NSString stringWithFormat:@"Failed to add device to group: %@", exception.reason], nil);
    }
}

- (void)removeDeviceFromGroup:(double)nodeAddress
                 groupAddress:(double)groupAddress
                     resolver:(RCTPromiseResolveBlock)resolve
                     rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddr = (UInt16)nodeAddress;
        UInt16 groupAddr = (UInt16)groupAddress;

        // Remove device from group subscription
        [[SDKLibCommand share] configModelSubscriptionDeleteWithDestination:nodeAddr
                                                           subscriptionDelete:[[SigConfigModelSubscriptionDelete alloc] initWithElementAddress:nodeAddr address:groupAddr modelIdentifier:SigModelID_GenericOnOffServer]
                                                                   retryCount:2
                                                              responseMaxCount:1
                                                                  successCallback:^(UInt16 source, UInt16 destination, SigConfigModelSubscriptionStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"GROUP_ERROR", [NSString stringWithFormat:@"Failed to remove device from group: %@", error.localizedDescription], error);
            }
        }];

    } @catch (NSException *exception) {
        reject(@"GROUP_ERROR", [NSString stringWithFormat:@"Failed to remove device from group: %@", exception.reason], nil);
    }
}

- (void)sendGroupCommand:(double)groupAddress
                    isOn:(BOOL)isOn
          transitionTime:(NSNumber *)transitionTime
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 groupAddr = (UInt16)groupAddress;
        UInt8 transition = transitionTime ? [transitionTime unsignedCharValue] : 0;

        // Send command to all devices in group
        SigGenericOnOffSet *message = [[SigGenericOnOffSet alloc] initWithOnOff:isOn transitionTime:transition delay:0];

        [[SDKLibCommand share] genericOnOffSetWithDestination:groupAddr
                                                     onOffSet:message
                                                   retryCount:2
                                              responseMaxCount:1
                                                  successCallback:^(UInt16 source, UInt16 destination, SigGenericOnOffStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"GROUP_ERROR", [NSString stringWithFormat:@"Failed to send group command: %@", error.localizedDescription], error);
            }
        }];

    } @catch (NSException *exception) {
        reject(@"GROUP_ERROR", [NSString stringWithFormat:@"Failed to send group command: %@", exception.reason], nil);
    }
}

// Scene Control
- (void)sendSceneStore:(double)address
               sceneId:(double)sceneId
              resolver:(RCTPromiseResolveBlock)resolve
              rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddr = (UInt16)address;
        UInt16 sceneNumber = (UInt16)sceneId;

        SigSceneStore *message = [[SigSceneStore alloc] initWithSceneNumber:sceneNumber];

        [[SDKLibCommand share] sceneStoreWithDestination:nodeAddr
                                              sceneStore:message
                                              retryCount:2
                                         responseMaxCount:1
                                             successCallback:^(UInt16 source, UInt16 destination, SigSceneRegisterStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to store scene: %@", error.localizedDescription], error);
            }
        }];

    } @catch (NSException *exception) {
        reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to store scene: %@", exception.reason], nil);
    }
}

- (void)sendSceneRecall:(double)address
                sceneId:(double)sceneId
               resolver:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddr = (UInt16)address;
        UInt16 sceneNumber = (UInt16)sceneId;

        SigSceneRecall *message = [[SigSceneRecall alloc] initWithSceneNumber:sceneNumber transitionTime:0 delay:0];

        [[SDKLibCommand share] sceneRecallWithDestination:nodeAddr
                                              sceneRecall:message
                                              retryCount:2
                                         responseMaxCount:1
                                             successCallback:^(UInt16 source, UInt16 destination, SigSceneStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to recall scene: %@", error.localizedDescription], error);
            }
        }];

    } @catch (NSException *exception) {
        reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to recall scene: %@", exception.reason], nil);
    }
}

- (void)sendSceneDelete:(double)address
                sceneId:(double)sceneId
               resolver:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddr = (UInt16)address;
        UInt16 sceneNumber = (UInt16)sceneId;

        SigSceneDelete *message = [[SigSceneDelete alloc] initWithSceneNumber:sceneNumber];

        [[SDKLibCommand share] sceneDeleteWithDestination:nodeAddr
                                              sceneDelete:message
                                              retryCount:2
                                         responseMaxCount:1
                                             successCallback:^(UInt16 source, UInt16 destination, SigSceneRegisterStatus * _Nonnull responseMessage) {
            resolve(nil);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to delete scene: %@", error.localizedDescription], error);
            }
        }];

    } @catch (NSException *exception) {
        reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to delete scene: %@", exception.reason], nil);
    }
}

- (void)sendSceneRegisterGet:(double)address
                    resolver:(RCTPromiseResolveBlock)resolve
                    rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 nodeAddr = (UInt16)address;

        SigSceneRegisterGet *message = [[SigSceneRegisterGet alloc] init];

        [[SDKLibCommand share] sceneRegisterGetWithDestination:nodeAddr
                                             sceneRegisterGet:message
                                                   retryCount:2
                                              responseMaxCount:1
                                                  successCallback:^(UInt16 source, UInt16 destination, SigSceneRegisterStatus * _Nonnull responseMessage) {
            NSMutableArray *scenes = [NSMutableArray array];
            for (NSNumber *sceneNum in responseMessage.scenes) {
                [scenes addObject:sceneNum];
            }
            resolve(scenes);
        } resultCallback:^(BOOL isResponseAll, NSError * _Nullable error) {
            if (error) {
                reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to get scene register: %@", error.localizedDescription], error);
            }
        }];

    } @catch (NSException *exception) {
        reject(@"SCENE_ERROR", [NSString stringWithFormat:@"Failed to get scene register: %@", exception.reason], nil);
    }
}

// Network Information
- (void)getAllNodes:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        NSMutableArray *nodes = [NSMutableArray array];
        for (SigNodeModel *node in self.dataSource.nodes) {
            NSDictionary *nodeDict = @{
                @"unicastAddress": @(node.address),
                @"deviceKey": node.deviceKey ?: @"",
                @"uuid": node.UUID ?: @"",
                @"name": node.name ?: @"Unknown Device",
                @"isOnline": @(node.state == DeviceStateOutOfLine ? NO : YES)
            };
            [nodes addObject:nodeDict];
        }
        resolve(nodes);
    } @catch (NSException *exception) {
        reject(@"GET_NODES_ERROR", [NSString stringWithFormat:@"Failed to get nodes: %@", exception.reason], nil);
    }
}

- (void)getNodeInfo:(double)nodeAddress
           resolver:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        UInt16 addr = (UInt16)nodeAddress;
        SigNodeModel *node = [self.dataSource getNodeWithAddress:addr];
        
        if (node) {
            NSDictionary *nodeDict = @{
                @"unicastAddress": @(node.address),
                @"deviceKey": node.deviceKey ?: @"",
                @"uuid": node.UUID ?: @"",
                @"name": node.name ?: @"Unknown Device",
                @"isOnline": @(node.state == DeviceStateOutOfLine ? NO : YES)
            };
            resolve(nodeDict);
        } else {
            resolve(nil);
        }
    } @catch (NSException *exception) {
        reject(@"GET_NODE_ERROR", [NSString stringWithFormat:@"Failed to get node info: %@", exception.reason], nil);
    }
}

// Utility methods
- (void)checkBluetoothPermission:(RCTPromiseResolveBlock)resolve
                        rejecter:(RCTPromiseRejectBlock)reject
{
    BOOL hasPermission = [SigBluetooth share].centralManager.state == CBManagerStatePoweredOn;
    resolve(@(hasPermission));
}

- (void)requestBluetoothPermission:(RCTPromiseResolveBlock)resolve
                          rejecter:(RCTPromiseRejectBlock)reject
{
    // iOS handles Bluetooth permissions automatically
    BOOL hasPermission = [SigBluetooth share].centralManager.state == CBManagerStatePoweredOn;
    resolve(@(hasPermission));
}

- (void)isBluetoothEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
{
    BOOL isEnabled = [SigBluetooth share].centralManager.state == CBManagerStatePoweredOn;
    resolve(@(isEnabled));
}

// Event listeners (required by TurboModule spec)
- (void)addListener:(NSString *)eventName
{
    self.hasListeners = YES;
}

- (void)removeListeners:(double)count
{
    self.hasListeners = NO;
}

// RCTEventEmitter required methods
- (NSArray<NSString *> *)supportedEvents
{
    return @[@"deviceFound", @"scanStarted", @"scanStopped", @"provisioningProgress", 
             @"provisioningCompleted", @"provisioningFailed", @"deviceStatusChanged", 
             @"messageReceived", @"networkConnected", @"networkDisconnected", @"meshError"];
}

- (void)startObserving
{
    self.hasListeners = YES;
}

- (void)stopObserving
{
    self.hasListeners = NO;
}

// Helper methods
- (void)onDeviceFound:(CBPeripheral *)peripheral
    advertisementData:(NSDictionary *)advertisementData
                 RSSI:(NSNumber *)RSSI
{
    NSDictionary *device = @{
        @"address": peripheral.identifier.UUIDString,
        @"name": peripheral.name ?: @"Unknown Device",
        @"rssi": RSSI,
        @"advertisementData": @{
            @"uuid": peripheral.identifier.UUIDString,
            @"manufacturerData": [advertisementData[CBAdvertisementDataManufacturerDataKey] description] ?: @""
        }
    };
    
    // Check if device already exists
    BOOL exists = NO;
    for (NSDictionary *existingDevice in self.discoveredDevices) {
        if ([existingDevice[@"address"] isEqualToString:device[@"address"]]) {
            exists = YES;
            break;
        }
    }
    
    if (!exists) {
        [self.discoveredDevices addObject:device];
        
        // Send device found event
        if (self.hasListeners) {
            [self sendEventWithName:@"deviceFound" body:device];
        }
    }
}

- (CBPeripheral *)findPeripheralByAddress:(NSString *)address
{
    // This would need to be implemented based on how peripherals are stored
    // For now, return nil
    return nil;
}

// SigMessageDelegate methods
- (void)didReceiveMessage:(SigMeshMessage *)message sentFromSource:(UInt16)source toDestination:(UInt16)destination
{
    if (self.hasListeners) {
        NSDictionary *messageDict = @{
            @"source": @(source),
            @"destination": @(destination),
            @"opcode": @(message.opCode),
            @"data": @[],
            @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000),
            @"acknowledged": @(message.isEncryptByDeviceKey)
        };
        [self sendEventWithName:@"messageReceived" body:messageDict];
    }
}

// TurboModule support
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeTelinkBleSpecJSI>(params);
}

@end
