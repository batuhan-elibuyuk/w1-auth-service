const { expect } = require("chai");
const sinon = require("sinon");
const HexaPermissionManager = require("../../src/project-session/hexa-permission");

describe("HexaPermissionManager", () => {
  let manager, session;

  beforeEach(() => {
    session = {
      _USERID: "user1",
      userGroupIdList: ["group1", "group2"],
    };
    const hexaAuth = { session };
    manager = new HexaPermissionManager(hexaAuth);
  });

  describe("getMostSpecificPermission", () => {
    it("should match objectId if provided", () => {
      const permissions = [{ objectId: "obj1", canDo: true }];
      const result = manager.getMostSpecificPermission(permissions, "obj1");
      expect(result).to.be.true;
    });

    it("should match subjectUser if objectId does not match", () => {
      const permissions = [{ subjectUserId: "user1", canDo: true }];
      const result = manager.getMostSpecificPermission(
        permissions,
        "unknownObj",
      );
      expect(result).to.be.true;
    });

    it("should match groupId if previous checks fail", () => {
      const permissions = [{ subjectUserGroupId: "group2", canDo: true }];
      const result = manager.getMostSpecificPermission(permissions, "none");
      expect(result).to.be.true;
    });

    it("should return first permission if no match", () => {
      const permissions = [{ randomField: "x", canDo: true }];
      const result = manager.getMostSpecificPermission(permissions, "none");
      expect(result).to.be.true;
    });

    it("should return false if no permissions", () => {
      const result = manager.getMostSpecificPermission([], "obj1");
      expect(result).to.be.false;
    });
  });

  describe("checkPermissionForSession", () => {
    it("should return false if permissions are empty", async () => {
      sinon.stub(manager, "getPermissions").resolves([]);
      const result = await manager.checkPermissionForSession("main", "obj1");
      expect(result).to.be.false;
    });

    it("should return permission from getMostSpecificPermission", async () => {
      sinon
        .stub(manager, "getPermissions")
        .resolves([{ objectId: "obj1", canDo: true }]);

      const result = await manager.checkPermissionForSession("main", "obj1");
      expect(result).to.be.true;
    });
  });

  describe("_getAllowedObjects", () => {
    it("should return allowed object ids", async () => {
      sinon
        .stub(manager, "getObjectPermissions")
        .resolves([{ objectId: "o1", canDo: true }]);

      const result = await manager._getAllowedObjects("main");
      expect(result).to.deep.equal(["o1"]);
    });

    it("should return empty if no permissions", async () => {
      sinon.stub(manager, "getObjectPermissions").resolves([]);
      const result = await manager._getAllowedObjects("main");
      expect(result).to.deep.equal([]);
    });
  });

  describe("_getRestrictedObjects", () => {
    it("should return restricted object ids", async () => {
      sinon
        .stub(manager, "getObjectPermissions")
        .resolves([{ objectId: "o2", canDo: false }]);

      const result = await manager._getRestrictedObjects("main");
      expect(result).to.deep.equal(["o2"]);
    });

    it("should return empty if no restricted permissions", async () => {
      sinon
        .stub(manager, "getObjectPermissions")
        .resolves([{ objectId: "o3", canDo: true }]);

      const result = await manager._getRestrictedObjects("main");
      expect(result).to.deep.equal([]);
    });
  });

  describe("getAllowedObjectsByPermission", () => {
    it("should return topLevel=true and restrictedObjects", async () => {
      sinon.stub(manager, "_getTopLevePermission").resolves(true);
      sinon.stub(manager, "_getRestrictedObjects").resolves(["o1"]);

      const result = await manager.getAllowedObjects("main");
      expect(result).to.deep.equal({
        topLevel: true,
        restrictedObjects: ["o1"],
      });
    });

    it("should return topLevel=false and allowedObjects", async () => {
      sinon.stub(manager, "_getTopLevePermission").resolves(false);
      sinon.stub(manager, "_getAllowedObjects").resolves(["o2"]);

      const result = await manager.getAllowedObjects("main");
      expect(result).to.deep.equal({
        topLevel: false,
        allowedObjects: ["o2"],
      });
    });
  });

  describe("getPermissionFilter", () => {
    it("should return correct permission filter for topLevel=true", async () => {
      sinon.stub(manager, "getAllowedObjects").resolves({
        topLevel: true,
        restrictedObjects: ["x1", "x2"],
      });

      const result = await manager.getPermissionFilter("main");

      expect(result).to.deep.equal({
        canDo: true,
        exceptions: ["x1", "x2"],
      });
    });

    it("should return correct permission filter for topLevel=false", async () => {
      sinon.stub(manager, "getAllowedObjects").resolves({
        topLevel: false,
        allowedObjects: ["x3", "x4"],
      });

      const result = await manager.getPermissionFilter("main");

      expect(result).to.deep.equal({
        canDo: false,
        exceptions: ["x3", "x4"],
      });
    });
  });
});
