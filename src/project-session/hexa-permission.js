const { ElasticIndexer } = require("serviceCommon");

class HexaPermissionManager {
  constructor(hexaAuth) {
    this.hexaAuth = hexaAuth;
    this.session = hexaAuth.session;
    this.tenantIdName = "clientId";
  }

  async getCurrentUserPermissions() {}
  async getCurrentRolePermissions() {}
  async getObjectGivenPermissionsFromElastic(permissionName) {}
  async getRootGivenPermissionsFromElastic(permissionName) {}
  async getAllGivenPermissionsFromElastic(permissionName, objectId) {}

  async getPermissions(permissionName, objectId) {
    return await this.getAllGivenPermissionsFromElastic(
      permissionName,
      objectId,
    );
  }

  async getRootPermissions(permissionName) {
    return await this.getRootGivenPermissionsFromElastic(permissionName);
  }

  async getObjectPermissions(permissionName) {
    return await this.getObjectGivenPermissionsFromElastic(permissionName);
  }

  async _getTopLevePermission(permissionName) {
    const permissions = await this.getRootPermissions(permissionName);
    return await this.getMostSpecificPermission(permissions, null);
  }

  getMostSpecificPermission(fPermissions, objectId) {
    // there are more than 1 permissions left, so use them as override order
    // most specific is the valid one

    if (objectId) {
      // check if there are any specific to target object
      const sPermissions = fPermissions.filter(
        (permission) => permission.objectId === objectId,
      );
      if (sPermissions.length === 1) return sPermissions[0].canDo;
      if (sPermissions.length > 0) fPermissions = sPermissions;
    }

    // check if there are any specific to target subject user
    const uPermissions = fPermissions.filter(
      (permission) => permission.subjectUserId === this.session._USERID,
    );
    if (uPermissions.length === 1) return uPermissions[0].canDo;
    if (uPermissions.length > 0) fPermissions = uPermissions;

    // check if there are any specific to target subject user group
    const gPermissions = fPermissions.filter((permission) =>
      this.session.userGroupIdList.includes(permission.subjectUserGroupId),
    );
    if (gPermissions.length === 1) return gPermissions[0].canDo;
    if (gPermissions.length > 0) fPermissions = gPermissions;

    // no priority criteria left, just use the first permission
    if (fPermissions.length > 0) return fPermissions[0].canDo;
    return false;
  }

  async checkPermissionForSession(permissionName, objectId) {
    const permissions = await this.getPermissions(permissionName);
    if (!permissions.length) return false;
    return this.getMostSpecificPermission(permissions, objectId);
  }

  async _getRestrictedObjects(permissionName) {
    const permissions = await this.getObjectPermissions(permissionName);
    if (!permissions.length) return [];
    const fPermissions = permissions.filter((permission) => !permission.canDo);
    if (!fPermissions.length) return [];
    return fPermissions.map((permission) => permission.objectId);
  }

  async _getAllowedObjects(permissionName) {
    const permissions = await this.getObjectPermissions(permissionName);
    if (!permissions.length) return [];

    const fPermissions = permissions.filter((permission) => permission.canDo);
    if (!fPermissions.length) return [];
    return fPermissions.map((permission) => permission.objectId);
  }

  async getAllowedObjects(permissionName) {
    const topLevelPermission = await this._getTopLevePermission(permissionName);
    const result = {
      topLevel: topLevelPermission,
    };
    if (topLevelPermission) {
      result.restrictedObjects =
        await this._getRestrictedObjects(permissionName);
    } else {
      result.allowedObjects = await this._getAllowedObjects(permissionName);
    }
    return result;
  }

  async getPermissionFilter(permissionName) {
    const allowedObjects = await this.getAllowedObjects(permissionName);
    const pFilter = {
      canDo: allowedObjects.topLevel,
      exceptions: allowedObjects.topLevel
        ? allowedObjects.restrictedObjects
        : allowedObjects.allowedObjects,
    };
    console.log("Permission filter", pFilter, allowedObjects);
    return pFilter;
  }
}

module.exports = HexaPermissionManager;
