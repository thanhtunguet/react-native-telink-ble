/**
 * React Hooks for Telink BLE Mesh
 *
 * @module hooks
 */

export {
  useTelinkMesh,
  default as useTelinkMeshDefault,
} from './useTelinkMesh';
export {
  useDeviceControl,
  default as useDeviceControlDefault,
  type UseDeviceControlOptions,
  type UseDeviceControlReturn,
} from './useDeviceControl';
export {
  useNetworkHealth,
  default as useNetworkHealthDefault,
  type UseNetworkHealthOptions,
  type UseNetworkHealthReturn,
} from './useNetworkHealth';
export {
  useProvisioning,
  default as useProvisioningDefault,
  type UseProvisioningOptions,
  type UseProvisioningReturn,
} from './useProvisioning';
export {
  useFirmwareUpdate,
  default as useFirmwareUpdateDefault,
  type UseFirmwareUpdateOptions,
  type UseFirmwareUpdateReturn,
} from './useFirmwareUpdate';
export {
  useVendorCommands,
  default as useVendorCommandsDefault,
  type UseVendorCommandsOptions,
  type UseVendorCommandsReturn,
} from './useVendorCommands';
export {
  useScanning,
  default as useScanningDefault,
  type UseScanningOptions,
  type UseScanningReturn,
} from './useScanning';
export {
  useGroups,
  default as useGroupsDefault,
  type UseGroupsOptions,
  type UseGroupsReturn,
} from './useGroups';
