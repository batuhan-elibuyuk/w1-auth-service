const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { NotFoundError } = require("common");

describe("DBDeleteCommand Variants", () => {
  let commands;

  beforeEach(() => {
    commands = proxyquire("../../src/db-command/db-delete-command.js", {
      common: { NotFoundError },
      "../../src/db-command/db-command.js": class {
        constructor(input) {
          this.input = input;
          this.queryCacheInvalidator = {
            invalidateCache: sinon.stub(),
            invalidateAll: sinon.stub(),
          };
          this.entityCacher = {
            delEntityFromCache: sinon.stub(),
          };
          this.indexDataToElastic = sinon.stub().resolves();
          this.dbData = { id: "mock-id" };
        }
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("postCommand", () => {
    it("should invalidate specific cache if oldDbData exists", async () => {
      const input = { id: "123" };
      const cmd = new commands.DBHardDeleteMongooseCommand(input, {}, false);
      cmd.oldDbData = { id: "x" };

      await cmd.postCommand();

      expect(cmd.queryCacheInvalidator.invalidateCache.calledOnce).to.be.true;
      expect(cmd.entityCacher.delEntityFromCache.calledWith("123")).to.be.true;
      expect(cmd.indexDataToElastic.calledOnce).to.be.true;
    });

    it("should invalidate all cache if oldDbData is missing", async () => {
      const input = { id: "456" };
      const cmd = new commands.DBHardDeleteMongooseCommand(input, {}, false);
      cmd.oldDbData = null;

      await cmd.postCommand();

      expect(cmd.queryCacheInvalidator.invalidateAll.calledOnce).to.be.true;
    });
  });

  describe("DBSoftDeleteMongooseCommand", () => {
    it("should soft delete document successfully", async () => {
      const dbDocMock = { getData: sinon.stub().returns({ id: "doc-id" }) };
      const mongooseModel = {
        findOneAndUpdate: sinon.stub().resolves(dbDocMock),
      };

      const input = {};
      const cmd = new commands.DBSoftDeleteMongooseCommand(input, {}, false);
      cmd.mongooseModel = mongooseModel;
      cmd.whereClause = { id: "123" };
      cmd.objectName = "deleted";

      await cmd.runDelete();

      expect(cmd.dbData).to.eql({ id: "doc-id" });
      expect(input.deleted).to.eql({ id: "doc-id" });
    });

    it("should throw NotFoundError if no document found", async () => {
      const mongooseModel = {
        findOneAndUpdate: sinon.stub().resolves(null),
      };

      const cmd = new commands.DBSoftDeleteMongooseCommand({}, {}, false);
      cmd.mongooseModel = mongooseModel;
      cmd.whereClause = {};

      try {
        await cmd.runDelete();
        throw new Error("Expected NotFoundError not thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("DBHardDeleteMongooseCommand", () => {
    it("should hard delete document", async () => {
      const dbModel = {
        findOneAndDelete: sinon.stub().resolves({ id: "doc" }),
      };
      const input = { id: "123" };
      const cmd = new commands.DBHardDeleteMongooseCommand(
        input,
        dbModel,
        false,
      );
      cmd.whereClause = {};
      cmd.objectName = "deleted";

      await cmd.runDelete();

      expect(cmd.dbData).to.eql({ id: "123" });
      expect(input.deleted).to.eql({ id: "123" });
    });

    it("should throw NotFoundError if no record deleted", async () => {
      const dbModel = {
        findOneAndDelete: sinon.stub().resolves(null),
      };
      const cmd = new commands.DBHardDeleteMongooseCommand({}, dbModel, false);
      cmd.whereClause = {};

      try {
        await cmd.runDelete();
        throw new Error("Expected NotFoundError not thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("DBSoftDeleteSequelizeCommand", () => {
    it("should soft delete sequelize record", async () => {
      const updatedDoc = { getData: sinon.stub().returns({ id: "seq-id" }) };
      const dbModel = {
        update: sinon.stub().resolves([1, [updatedDoc]]),
      };

      const input = {};
      const cmd = new commands.DBSoftDeleteSequelizeCommand(
        input,
        dbModel,
        false,
      );
      cmd.whereClause = {};
      cmd.objectName = "deleted";

      await cmd.runDelete();

      expect(cmd.dbData).to.eql({ id: "seq-id" });
      expect(input.deleted).to.eql({ id: "seq-id" });
    });

    it("should throw NotFoundError if update returned no record", async () => {
      const dbModel = {
        update: sinon.stub().resolves([0, []]),
      };

      const cmd = new commands.DBSoftDeleteSequelizeCommand({}, dbModel, false);
      cmd.whereClause = {};

      try {
        await cmd.runDelete();
        throw new Error("Expected NotFoundError not thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("DBHardDeleteSequelizeCommand", () => {
    it("should hard delete sequelize record", async () => {
      const dbModel = {
        destroy: sinon.stub().resolves(1),
      };
      const input = { id: "xyz" };
      const cmd = new commands.DBHardDeleteSequelizeCommand(
        input,
        dbModel,
        false,
      );
      cmd.whereClause = {};
      cmd.objectName = "deleted";

      await cmd.runDelete();

      expect(cmd.dbData).to.eql({ id: "xyz" });
      expect(input.deleted).to.eql({ id: "xyz" });
    });

    it("should throw NotFoundError if no rows deleted", async () => {
      const dbModel = {
        destroy: sinon.stub().resolves(0),
      };

      const cmd = new commands.DBHardDeleteSequelizeCommand({}, dbModel, false);
      cmd.whereClause = {};

      try {
        await cmd.runDelete();
        throw new Error("Expected NotFoundError not thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });
});
