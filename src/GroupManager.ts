import telinkBle from './index';
import type { MeshGroup, ColorHSL, ControlOptions } from './types';

/**
 * High-level group management helper class
 * Provides convenient methods for managing groups and scenes
 */
export class GroupManager {
  private groups: Map<number, MeshGroup> = new Map();

  /**
   * Create a new group
   * @param groupAddress Group address (0xC000 - 0xFEFF)
   * @param name Group name
   */
  async createGroup(groupAddress: number, name: string): Promise<MeshGroup> {
    await telinkBle.createGroup(groupAddress, name);

    const group: MeshGroup = {
      address: groupAddress,
      name,
      devices: [],
    };

    this.groups.set(groupAddress, group);
    return group;
  }

  /**
   * Add device to group
   * @param nodeAddress Device address
   * @param groupAddress Group address
   */
  async addDeviceToGroup(
    nodeAddress: number,
    groupAddress: number
  ): Promise<void> {
    await telinkBle.addDeviceToGroup(nodeAddress, groupAddress);

    // Update local tracking
    const group = this.groups.get(groupAddress);
    if (group && !group.devices.includes(nodeAddress)) {
      group.devices.push(nodeAddress);
    }
  }

  /**
   * Remove device from group
   * @param nodeAddress Device address
   * @param groupAddress Group address
   */
  async removeDeviceFromGroup(
    nodeAddress: number,
    groupAddress: number
  ): Promise<void> {
    await telinkBle.removeDeviceFromGroup(nodeAddress, groupAddress);

    // Update local tracking
    const group = this.groups.get(groupAddress);
    if (group) {
      group.devices = group.devices.filter((addr) => addr !== nodeAddress);
    }
  }

  /**
   * Add multiple devices to a group
   * @param nodeAddresses Array of device addresses
   * @param groupAddress Group address
   */
  async addMultipleDevicesToGroup(
    nodeAddresses: number[],
    groupAddress: number
  ): Promise<void> {
    for (const addr of nodeAddresses) {
      await this.addDeviceToGroup(addr, groupAddress);
    }
  }

  /**
   * Remove multiple devices from a group
   * @param nodeAddresses Array of device addresses
   * @param groupAddress Group address
   */
  async removeMultipleDevicesFromGroup(
    nodeAddresses: number[],
    groupAddress: number
  ): Promise<void> {
    for (const addr of nodeAddresses) {
      await this.removeDeviceFromGroup(addr, groupAddress);
    }
  }

  /**
   * Control all devices in a group
   * @param groupAddress Group address
   * @param isOn True to turn on, false to turn off
   * @param options Control options
   */
  async controlGroup(
    groupAddress: number,
    isOn: boolean,
    options?: ControlOptions
  ): Promise<void> {
    await telinkBle.sendGroupCommand(
      groupAddress,
      isOn,
      options?.transitionTime
    );
  }

  /**
   * Set group brightness level
   * @param groupAddress Group address
   * @param level Brightness level (0-100)
   * @param options Control options
   */
  async setGroupLevel(
    groupAddress: number,
    level: number,
    options?: ControlOptions
  ): Promise<void> {
    // Send to group address
    await telinkBle.sendGenericLevel(
      groupAddress,
      level,
      options?.transitionTime
    );
  }

  /**
   * Set group color
   * @param groupAddress Group address
   * @param color HSL color
   * @param options Control options
   */
  async setGroupColor(
    groupAddress: number,
    color: ColorHSL,
    options?: ControlOptions
  ): Promise<void> {
    await telinkBle.sendColorHSL(
      groupAddress,
      color.hue,
      color.saturation,
      color.lightness,
      options?.transitionTime
    );
  }

  /**
   * Store current group state as a scene
   * @param groupAddress Group address
   * @param sceneId Scene identifier
   */
  async storeGroupScene(groupAddress: number, sceneId: number): Promise<void> {
    const group = this.groups.get(groupAddress);
    if (!group) {
      throw new Error(`Group ${groupAddress} not found`);
    }

    // Store scene on all devices in group
    for (const deviceAddr of group.devices) {
      await telinkBle.sendSceneStore(deviceAddr, sceneId);
    }
  }

  /**
   * Recall a scene for a group
   * @param groupAddress Group address
   * @param sceneId Scene identifier
   */
  async recallGroupScene(groupAddress: number, sceneId: number): Promise<void> {
    await telinkBle.sendSceneRecall(groupAddress, sceneId);
  }

  /**
   * Delete a scene from a group
   * @param groupAddress Group address
   * @param sceneId Scene identifier
   */
  async deleteGroupScene(groupAddress: number, sceneId: number): Promise<void> {
    const group = this.groups.get(groupAddress);
    if (!group) {
      throw new Error(`Group ${groupAddress} not found`);
    }

    // Delete scene from all devices in group
    for (const deviceAddr of group.devices) {
      await telinkBle.sendSceneDelete(deviceAddr, sceneId);
    }
  }

  /**
   * Get all groups
   */
  getAllGroups(): MeshGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get group by address
   * @param groupAddress Group address
   */
  getGroup(groupAddress: number): MeshGroup | undefined {
    return this.groups.get(groupAddress);
  }

  /**
   * Get devices in a group
   * @param groupAddress Group address
   */
  getGroupDevices(groupAddress: number): number[] {
    const group = this.groups.get(groupAddress);
    return group ? group.devices : [];
  }

  /**
   * Turn on all devices in a group with transition
   * @param groupAddress Group address
   * @param transitionTime Transition time in ms
   */
  async turnOnGroup(
    groupAddress: number,
    transitionTime: number = 500
  ): Promise<void> {
    await this.controlGroup(groupAddress, true, { transitionTime });
  }

  /**
   * Turn off all devices in a group with transition
   * @param groupAddress Group address
   * @param transitionTime Transition time in ms
   */
  async turnOffGroup(
    groupAddress: number,
    transitionTime: number = 500
  ): Promise<void> {
    await this.controlGroup(groupAddress, false, { transitionTime });
  }

  /**
   * Dim all devices in a group
   * @param groupAddress Group address
   * @param level Brightness level (0-100)
   * @param transitionTime Transition time in ms
   */
  async dimGroup(
    groupAddress: number,
    level: number,
    transitionTime: number = 1000
  ): Promise<void> {
    await this.setGroupLevel(groupAddress, level, { transitionTime });
  }

  /**
   * Create a room with devices
   * Convenience method to create a group and add devices in one call
   * @param groupAddress Group address
   * @param name Room name
   * @param devices Array of device addresses
   */
  async createRoom(
    groupAddress: number,
    name: string,
    devices: number[]
  ): Promise<MeshGroup> {
    const group = await this.createGroup(groupAddress, name);
    await this.addMultipleDevicesToGroup(devices, groupAddress);
    return group;
  }

  /**
   * Create multiple groups
   * @param groups Array of group configurations
   */
  async createMultipleGroups(
    groups: Array<{ address: number; name: string; devices?: number[] }>
  ): Promise<MeshGroup[]> {
    const createdGroups: MeshGroup[] = [];

    for (const groupConfig of groups) {
      const group = await this.createGroup(
        groupConfig.address,
        groupConfig.name
      );

      if (groupConfig.devices && groupConfig.devices.length > 0) {
        await this.addMultipleDevicesToGroup(
          groupConfig.devices,
          groupConfig.address
        );
      }

      createdGroups.push(group);
    }

    return createdGroups;
  }

  /**
   * Synchronize group state from mesh network
   * Useful after app restart to restore group information
   * @param groups Array of group data from storage
   */
  syncGroups(groups: MeshGroup[]): void {
    this.groups.clear();
    groups.forEach((group) => {
      this.groups.set(group.address, group);
    });
  }

  /**
   * Export groups for storage
   */
  exportGroups(): MeshGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Clear all groups
   */
  clearGroups(): void {
    this.groups.clear();
  }

  /**
   * Find groups containing a specific device
   * @param nodeAddress Device address
   */
  findGroupsWithDevice(nodeAddress: number): MeshGroup[] {
    return Array.from(this.groups.values()).filter((group) =>
      group.devices.includes(nodeAddress)
    );
  }

  /**
   * Check if a device is in a group
   * @param nodeAddress Device address
   * @param groupAddress Group address
   */
  isDeviceInGroup(nodeAddress: number, groupAddress: number): boolean {
    const group = this.groups.get(groupAddress);
    return group ? group.devices.includes(nodeAddress) : false;
  }
}

export default GroupManager;
