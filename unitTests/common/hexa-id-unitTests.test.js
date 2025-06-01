const { expect } = require("chai");
const sinon = require("sinon");
const mongoose = require("mongoose");

const {
  newUUID,
  newObjectId,
  objectIdToUUID,
  UUIDtoObjectId,
  shortUUID,
  longUUID,
  isValidUUID,
  isValidObjectId,
  createHexCode,
} = require("../../src/common/hexa-id");

describe("ID Helpers Functions", function () {
  this.timeout(5000);

  afterEach(() => {
    sinon.restore();
  });

  describe("createHexCode", function () {
    it("should generate a valid 32-character hex code", function () {
      const hexCode = createHexCode();
      expect(hexCode).to.be.a("string").with.lengthOf(32);
      expect(/^[A-F0-9]+$/i.test(hexCode)).to.be.true;
    });
  });

  describe("isValidObjectId", function () {
    it("should validate correct ObjectId", function () {
      expect(isValidObjectId("507f191e810c19729de860ea")).to.be.true;
    });

    it("should return false for invalid ObjectId", function () {
      expect(isValidObjectId("invalid-objectid")).to.be.false;
    });

    it("should return false for non-hex characters", function () {
      expect(isValidObjectId("507f191e810c19729de860gq")).to.be.false;
    });
  });

  describe("isValidUUID", function () {
    it("should return true for a valid UUID", function () {
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).to.be.true;
    });

    it("should return false for an invalid UUID", function () {
      expect(isValidUUID("invalid-uuid")).to.be.false;
    });

    it("should return false for incorrect length", function () {
      expect(isValidUUID("550e8400-e29b-41d4")).to.be.false;
    });

    it("should return false for null UUID", () => {
      expect(isValidUUID(null)).to.be.false;
    });

    it("should return false for undefined UUID", () => {
      expect(isValidUUID(undefined)).to.be.false;
    });
  });

  describe("newObjectId", function () {
    it("should generate a valid ObjectId", function () {
      const objId = newObjectId();
      expect(objId).to.be.a("string").with.lengthOf(24);
      expect(isValidObjectId(objId)).to.be.true;
    });

    it("should correctly generate a 24-character ObjectId", function () {
      // Stub ObjectId's toString() method to return a known value
      const stub = sinon
        .stub(mongoose.Types.ObjectId.prototype, "toString")
        .returns("507f191e810c19729de860ea");

      const objId = newObjectId();

      expect(objId).to.be.a("string").with.lengthOf(24);
      expect(objId).to.match(/^[A-F0-9]{24}$/i);

      stub.restore();
    });
  });

  describe("objectIdToUUID", function () {
    it("should convert ObjectId to UUID format", function () {
      const uuid = objectIdToUUID("507f191e810c19729de860ea");
      expect(uuid).to.be.a("string").with.lengthOf(32);
      expect(uuid.startsWith("507f191e810c19729de860ea")).to.be.true;
    });

    it("should return original value if input is invalid", function () {
      expect(objectIdToUUID("invalid")).to.equal("invalid");
    });

    it("should return original value if ObjectId has invalid characters", () => {
      const objId = "507f191e810c19729de860gq"; // 'gq' geçersiz
      const result = objectIdToUUID(objId);
      expect(result).to.equal(objId);
    });
  });

  describe("UUIDtoObjectId", function () {
    it("should convert UUID to ObjectId", function () {
      const objectId = UUIDtoObjectId("550e8400e29b41d4a716446655440000");
      expect(objectId).to.be.a("string").with.lengthOf(24);
      expect(objectId.startsWith("550e8400e29b41d4a7164466")).to.be.true;
    });

    it("should return original value if UUID is invalid", function () {
      expect(UUIDtoObjectId("invalid")).to.equal("invalid");
    });

    it("should return original value if UUID is not hex", () => {
      const result = UUIDtoObjectId("zxyw1234zxyw1234zxyw1234zxyw1234");
      expect(result).to.equal("zxyw1234zxyw1234zxyw1234zxyw1234");
    });
  });

  describe("shortUUID", function () {
    it("should remove dashes from UUID", function () {
      const shortUuid = shortUUID("550e8400-e29b-41d4-a716-446655440000");
      expect(shortUuid).to.equal("550e8400e29b41d4a716446655440000");
    });

    it("should return the same string if no dashes are present", function () {
      expect(shortUUID("550e8400e29b41d4a716446655440000")).to.equal(
        "550e8400e29b41d4a716446655440000",
      );
    });

    it("should return original input if not string (undefined)", () => {
      expect(shortUUID(undefined)).to.be.undefined;
    });
  });

  describe("longUUID", function () {
    it("should convert a 32-character UUID to a standard format", function () {
      const longUuid = longUUID("550e8400e29b41d4a716446655440000");
      expect(longUuid).to.equal("550e8400-e29b-41d4-a716-446655440000");
    });

    it("should return original input if UUID is invalid", function () {
      expect(longUUID("invalid")).to.equal("invalid");
    });

    it("should return original input if not valid hex", () => {
      const input = "invalidinvalidinvalidinvalidinvalidin";
      expect(longUUID(input)).to.equal(input);
    });
  });

  describe("newUUID", function () {
    it("should generate a 32-character UUID when isShort is true", function () {
      const uuid = newUUID(true);
      expect(uuid).to.be.a("string").with.lengthOf(32);
    });

    it("should generate a standard UUID when isShort is false", function () {
      const uuid = newUUID(false);
      expect(uuid).to.be.a("string").with.lengthOf(36);
      expect(uuid).to.match(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
      );

      it("should generate a standard UUID if param is undefined", () => {
        const uuid = newUUID();
        expect(uuid).to.be.a("string").with.lengthOf(36);
      });
    });
  });
});
