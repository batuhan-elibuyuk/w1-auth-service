const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("DBGetCommand Variants", () => {
  let commands;
  const NotFoundError = class extends Error {};
  const ForbiddenError = class extends Error {};

  beforeEach(() => {
    commands = proxyquire("../../src/db-command/db-get-command.js", {
      common: {
        NotFoundError,
        ForbiddenError,
      },
      "../../src/db-command/db-command.js": class {
        constructor(input) {
          this.input = input;
          this.session = input.session || {};
          this.objectName = "fetched";
          this.commandName = "GetSomething";
          this.whereClause = { id: input.id };
        }

        async runDbCommand() {}
        async buildWhereClause(input) {}
        getSelectList() {
          return [];
        }
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("DBGetCommand.preCommand", () => {
    it("should set dbData from cache", async () => {
      const cacheData = { id: "123", name: "test" };
      const entityCacher = {
        getEntityFromCache: sinon.stub().resolves(cacheData),
      };

      class TestCmd extends commands.DBGetSequelizeCommand {
        checkEntityOwnership() {
          return true;
        }
        getSelectList() {
          return ["id", "name"];
        }
      }

      const cmd = new TestCmd({ id: "123" });
      cmd.entityCacher = entityCacher;

      const result = await cmd.preCommand();

      expect(result).to.eql({ id: "123", name: "test", _source: "ecache" });
    });

    it("should throw NotAuthorizedError if ownership check fails", async () => {
      const cacheData = { id: "123", name: "test" };
      const entityCacher = {
        getEntityFromCache: sinon.stub().resolves(cacheData),
      };

      class TestCmd extends commands.DBGetSequelizeCommand {
        checkEntityOwnership() {
          return false;
        }
      }

      const cmd = new TestCmd({ id: "123" });
      cmd.entityCacher = entityCacher;

      try {
        await cmd.preCommand();
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should skip cache logic if entityCacher is not present", async () => {
      const cmd = new commands.DBGetSequelizeCommand({ id: "123" });
      const result = await cmd.preCommand();
      expect(result).to.be.undefined;
    });
  });

  describe("DBGetMongooseCommand.runDbCommand", () => {
    it("should load and map document data", async () => {
      const mockDoc = {
        getData: sinon.stub().returns({ id: "abc" }),
      };
      const dbModel = {
        findOne: sinon.stub().returns({ exec: sinon.stub().resolves(mockDoc) }),
      };

      const input = {};
      const cmd = new commands.DBGetMongooseCommand(input, dbModel);
      cmd.filterJsonField = sinon.stub().resolves();
      cmd.objectName = "fetched";
      cmd.whereClause = { id: "abc" };

      await cmd.runDbCommand();

      expect(cmd.dbData).to.eql({ id: "abc" });
      expect(input.fetched).to.eql({ id: "abc" });
    });

    it("should throw NotFoundError if no result", async () => {
      const dbModel = {
        findOne: sinon.stub().returns({ exec: sinon.stub().resolves(null) }),
      };

      const cmd = new commands.DBGetMongooseCommand({}, dbModel);
      cmd.whereClause = { id: "not_found" };
      cmd.nullResult = false;

      try {
        await cmd.runDbCommand();
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("DBGetSequelizeCommand.runDbCommand", () => {
    it("should load and map sequelize data", async () => {
      const mockRow = {
        getData: sinon.stub().returns({ id: "seq123" }),
      };
      const dbModel = {
        findOne: sinon.stub().resolves(mockRow),
      };

      class TestCmd extends commands.DBGetSequelizeCommand {
        buildIncludes() {
          return [{ model: "JoinModel" }];
        }
        getSelectList() {
          return ["id"];
        }
        setRead() {
          return null;
        }
        getCqrsJoins() {
          return Promise.resolve();
        }
        filterJsonField() {
          return Promise.resolve();
        }
      }

      const input = { getJoins: true, excludeCqrs: false };
      const cmd = new TestCmd(input, dbModel);
      cmd.whereClause = { id: "seq123" };
      cmd.objectName = "result";

      await cmd.runDbCommand();

      expect(cmd.dbData).to.eql({ id: "seq123" });
      expect(input.result).to.eql({ id: "seq123" });
      expect(dbModel.findOne.calledOnce).to.be.true;
    });

    it("should throw NotFoundError if no result", async () => {
      const dbModel = {
        findOne: sinon.stub().resolves(null),
      };

      const cmd = new commands.DBGetSequelizeCommand({}, dbModel);
      cmd.whereClause = {};
      cmd.nullResult = false;

      try {
        await cmd.runDbCommand();
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });
});
