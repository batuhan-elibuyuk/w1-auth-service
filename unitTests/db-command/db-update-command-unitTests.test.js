const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("DBUpdateCommand Variants", () => {
  let commands;

  const NotFoundError = class extends Error {};
  const BadRequestError = class extends Error {};

  beforeEach(() => {
    commands = proxyquire("../../src/db-command/db-update-command.js", {
      common: {
        NotFoundError,
        BadRequestError,
        sequelize: { literal: () => "LITERAL" },
      },
      serviceCommon: {
        ServicePublisher: class {
          constructor(event, payload, session) {
            this.publish = sinon.stub().resolves(true);
          }
        },
      },
      "../../src/db-command/db-command.js": class {
        constructor(input) {
          this.input = input;
          this.whereClause = input.whereClause || {};
          this.objectName = "updated";
          this.session = input.session;
          this.dataClause = input.dataClause || {};
        }

        normalizeSequalizeOps(obj) {
          return obj;
        }

        async runDbCommand() {}
        async buildDataClause() {}
        async buildWhereClause() {}
        getOldDataValues() {
          return {};
        }
        getNewDataValues() {
          return {};
        }
        async indexDataToElastic() {}
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("DBUpdateCommand.postCommand", () => {
    it("should invalidate cache and save entity if not bulk", async () => {
      const input = { isBulk: false };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);

      cmd.queryCacheInvalidator = {
        invalidateCache: sinon.stub(),
        invalidateAll: sinon.stub(),
      };
      cmd.entityCacher = {
        saveEntityToCache: sinon.stub().resolves(),
      };

      cmd.dbData = { id: 1 };
      cmd.oldDbData = { id: 2 };

      await cmd.postCommand();

      expect(cmd.queryCacheInvalidator.invalidateCache.calledWith(cmd.dbData))
        .to.be.true;
      expect(
        cmd.queryCacheInvalidator.invalidateCache.calledWith(cmd.oldDbData),
      ).to.be.true;
      expect(cmd.entityCacher.saveEntityToCache.calledWith(cmd.dbData)).to.be
        .true;
    });

    it("should skip caching if isBulk is true", async () => {
      const input = { isBulk: true };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);

      cmd.queryCacheInvalidator = {
        invalidateCache: sinon.stub(),
        invalidateAll: sinon.stub(),
      };
      cmd.entityCacher = {
        saveEntityToCache: sinon.stub(),
      };

      cmd.dbData = { id: 1 };

      await cmd.postCommand();

      expect(cmd.queryCacheInvalidator.invalidateCache.called).to.be.false;
      expect(cmd.entityCacher.saveEntityToCache.called).to.be.false;
    });
  });

  describe("DBUpdateCommand.buildDataClause", () => {
    it("should remove null values", async () => {
      const input = { dataClause: { name: "test", age: null } };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);
      cmd.dataClause = { name: "Ali", age: null };
      await cmd.buildDataClause(input);
      expect(cmd.dataClause).to.deep.equal({ name: "Ali" });
    });
  });

  describe("DBUpdateCommand data value helpers", () => {
    it("should get old and new values correctly", () => {
      const input = {};
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);
      cmd.dataClause = { name: "Ali", age: 30 };
      cmd.oldDbData = { name: "Ahmet", age: 25 };
      cmd.dbData = { name: "Ali", age: 30 };

      const oldVals = cmd.getOldDataValues();
      const newVals = cmd.getNewDataValues();

      expect(oldVals).to.eql({ name: "Ahmet", age: 25 });
      expect(newVals).to.eql({ name: "Ali", age: 30 });
    });
  });

  describe("DBUpdateCommand runSingleCommand and runBulkCommand", () => {
    it("should assign old/new values and call sync_childs in runSingleCommand", async () => {
      const input = { isBulk: false };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);
      cmd.dbData = { id: "abc" };
      cmd.getOldDataValues = () => ({ name: "old" });
      cmd.getNewDataValues = () => ({ name: "new" });
      const syncSpy = sinon.stub(cmd, "sync_childs").resolves();
      sinon.stub(cmd, "runUpdate").resolves();

      await cmd.runSingleCommand();

      expect(input.oldDataValues).to.eql({ name: "old" });
      expect(input.newDataValues).to.eql({ name: "new" });
      expect(syncSpy.calledOnce).to.be.true;
    });

    it("should mark old data messages in runBulkCommand", async () => {
      const input = { isBulk: true };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);
      sinon.stub(cmd, "runUpdate").resolves();

      await cmd.runBulkCommand();

      expect(input.old_updated).to.have.property("message");
      expect(input.oldDataValues).to.have.property("message");
      expect(input.newDataValues).to.have.property("message");
    });
  });

  describe("DBUpdateCommand.getEventPayload", () => {
    it("should return bulk payload when isBulk = true", async () => {
      const input = { isBulk: true };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);

      cmd.dbData = { affectedRows: [1, 2] };
      cmd.whereClause = { id: 5 };
      cmd.dataClause = { name: "Ali" };
      cmd.normalizeSequalizeOps = (obj) => ({ ...obj, normalized: true });

      const payload = await cmd.getEventPayload();

      expect(payload).to.deep.equal({
        affectedRows: [1, 2],
        whereClause: { id: 5, normalized: true },
        dataClause: { name: "Ali" },
      });
    });

    it("should return non-bulk payload when isBulk = false", async () => {
      const input = { isBulk: false };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);

      cmd.objectName = "user";
      cmd.oldDbData = { id: 1, name: "old" };
      cmd.dbData = { id: 1, name: "new" };
      cmd.dataClause = { name: "new" };
      cmd.getOldDataValues = () => ({ name: "old" });
      cmd.getNewDataValues = () => ({ name: "new" });

      const payload = await cmd.getEventPayload();

      expect(payload).to.deep.equal({
        old_user: { id: 1, name: "old" },
        user: { id: 1, name: "new" },
        oldDataValues: { name: "old" },
        newDataValues: { name: "new" },
      });
    });
  });

  describe("DBUpdateCommand.raiseDbEvent", () => {
    it("should publish event when dbEvent is set and emptyUpdate is false", async () => {
      const input = {};
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);

      cmd.dbEvent = "UserUpdated";
      cmd.emptyUpdate = false;
      cmd.getEventPayload = sinon.stub().resolves({ test: "data" });

      const publishSpy = sinon.stub().resolves(true);
      const mockPublisher = function () {
        this.publish = publishSpy;
      };

      const commandsWithMockPublisher = proxyquire(
        "../../src/db-command/db-update-command.js",
        {
          common: {
            NotFoundError,
            BadRequestError,
            sequelize: { literal: () => "LITERAL" },
          },
          serviceCommon: {
            ServicePublisher: mockPublisher,
          },
          "../../src/db-command/db-command.js": class {
            constructor(input) {
              this.input = input;
              this.dbData = {};
              this.objectName = "updated";
            }
          },
        },
      );

      // create a new instance using the mocked ServicePublisher
      const testCmd = new commandsWithMockPublisher.DBUpdateSequelizeCommand(
        input,
        {},
        false,
      );
      testCmd.dbEvent = "UserUpdated";
      testCmd.emptyUpdate = false;
      testCmd.getEventPayload = sinon.stub().resolves({ test: "data" });

      await testCmd.raiseDbEvent();

      expect(testCmd.getEventPayload.calledOnce).to.be.true;
    });

    it("should not publish if dbEvent is missing or emptyUpdate is true", async () => {
      const input = {};
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);

      cmd.dbEvent = null;
      cmd.emptyUpdate = false;

      const publishStub = sinon.stub().resolves();
      cmd.getEventPayload = sinon.stub().resolves({});

      const publisher = sinon.stub().returns({ publish: publishStub });
      cmd.ServicePublisher = publisher;

      await cmd.raiseDbEvent();

      expect(publishStub.called).to.be.false;
    });
  });

  describe("DBUpdateCommand.runDbCommand", () => {
    it("should call runBulkCommand when isBulk is true", async () => {
      const input = { isBulk: true };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);
      const bulkSpy = sinon.stub(cmd, "runBulkCommand").resolves();
      await cmd.runDbCommand();
      expect(bulkSpy.calledOnce).to.be.true;
    });

    it("should call runSingleCommand when isBulk is false", async () => {
      const input = { isBulk: false };
      const cmd = new commands.DBUpdateSequelizeCommand(input, {}, false);
      const singleSpy = sinon.stub(cmd, "runSingleCommand").resolves();
      await cmd.runDbCommand();
      expect(singleSpy.calledOnce).to.be.true;
    });
  });

  describe("DBUpdateMongooseCommand.runUpdate", () => {
    it("should run update and assign dbData", async () => {
      const doc = { getData: () => ({ id: "xyz" }) };
      const model = {
        findOneAndUpdate: sinon.stub().resolves(doc),
      };
      const input = { id: "xyz", isBulk: false };
      const cmd = new commands.DBUpdateMongooseCommand(input, model, false);
      cmd.whereClause = {};
      cmd.dataClause = { name: "Ali" };

      await cmd.runUpdate();

      expect(cmd.dbData).to.eql({ id: "xyz" });
    });

    it("should throw NotFoundError when document not found", async () => {
      const model = {
        findOneAndUpdate: sinon.stub().resolves(null),
      };
      const input = { isBulk: false };
      const cmd = new commands.DBUpdateMongooseCommand(input, model, false);
      cmd.whereClause = {};
      cmd.dataClause = { name: "Ali" };

      try {
        await cmd.runUpdate();
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("DBUpdateSequelizeCommand.runUpdate (bulk=false)", () => {
    it("should call _updateSingle", async () => {
      const input = {};
      const cmd = new commands.DBUpdateSequelizeCommand(
        input,
        {
          update: sinon
            .stub()
            .resolves([1, [{ getData: () => ({ id: "new" }) }]]),
        },
        false,
      );

      const spy = sinon.spy(cmd, "_updateSingle");
      cmd.dataClause = { name: "Ali" };

      await cmd.runUpdate();
      expect(spy.calledOnce).to.be.true;
    });

    it("should throw BadRequestError on empty update clause", async () => {
      const input = { isBulk: false };
      const mockModel = {
        findOne: sinon
          .stub()
          .resolves({ getData: () => ({ id: "should-not-be-used" }) }),
        update: sinon.stub().resolves([1, [null]]),
      };

      const cmd = new commands.DBUpdateSequelizeCommand(
        input,
        mockModel,
        false,
      );
      cmd.dataClause = {}; // Simulate empty update clause

      try {
        await cmd.runUpdate();
        throw new Error("Expected NotFoundError not thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
        expect(err.message).to.equal("errMsg_RecordNotFoundToUpdate");
      }
    });

    it("should throw NotFoundError if _updateSingle sets null dbData", async () => {
      const model = {
        update: sinon.stub().resolves([1, [null]]),
      };
      const input = {};
      const cmd = new commands.DBUpdateSequelizeCommand(input, model, false);
      cmd.dataClause = { name: "Ali" };
      try {
        await cmd.runUpdate();
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("DBUpdateSequelizeCommand.runUpdate (bulk=true)", () => {
    it("should call _updateBulkAll when updateEach is false", async () => {
      const input = { isBulk: true, updateEach: false };
      const model = {
        update: sinon.stub().resolves([1, [{ id: 1 }, { id: 2 }]]),
        findAll: sinon.stub().resolves([{ _id: 1 }, { _id: 2 }]),
      };
      const cmd = new commands.DBUpdateSequelizeCommand(input, model, false);

      cmd.dataClause = { name: "Ali" };
      cmd._afterIdListInBulkUpdate = async () => {};
      const bulkSpy = sinon.spy(cmd, "_updateBulkAll");

      await cmd.runUpdate();
      expect(cmd.dbData.affectedRows).to.eql([1, 2]);
    });

    it("should call _updateEachAll when updateEach = true and silentEachUpdate = false", async () => {
      const itemList = [
        { getData: () => ({ id: 1 }) },
        { getData: () => ({ id: 2 }) },
      ];
      const input = { isBulk: true, updateEach: true };
      const model = {
        findAll: sinon.stub().resolves(itemList),
      };
      const cmd = new commands.DBUpdateSequelizeCommand(input, model, false);

      cmd.dataClause = { name: "Ali" };
      cmd._afterItemListInBulkUpdate = async () => {};
      cmd._afterIdListInBulkUpdate = async () => {};
      cmd.silentEachUpdate = false;

      cmd.updateBulkItem = () => {}; // ✅ define method
      const eachSpy = sinon
        .stub(cmd, "updateBulkItem")
        .resolves({ id: "bulk-1" });

      await cmd.runUpdate();
      expect(eachSpy.calledTwice).to.be.true;
      expect(cmd.dbData.affectedRows).to.eql(["bulk-1", "bulk-1"]);
    });

    it("should call _updateSilentEachAll when updateEach = true and silentEachUpdate = true", async () => {
      const itemList = [
        { getData: () => ({ id: 1 }) },
        { getData: () => ({ id: 2 }) },
      ];
      const input = { isBulk: true, updateEach: true };
      const model = {
        findAll: sinon.stub().resolves(itemList),
        update: sinon.stub().resolves([1, [{ id: 1 }]]),
      };
      const cmd = new commands.DBUpdateSequelizeCommand(input, model, false);

      cmd.dataClause = { name: "Ali" };
      cmd._afterItemListInBulkUpdate = async () => {};
      cmd._afterIdListInBulkUpdate = async () => {};
      cmd.silentEachUpdate = true;

      cmd.getDataClauseForEachItem = async () => ({ field: "value" });
      cmd._updateSilentEachBulkItem = async (item) => item.id;

      await cmd.runUpdate();

      expect(cmd.dbData.affectedRows).to.eql([1, 2]);
    });
    it("should throw BadRequestError on empty clause when isBulk and updateEach are true", async () => {
      const input = { isBulk: true, updateEach: true };
      const mockModel = {
        findAll: sinon.stub().resolves([]),
      };

      const cmd = new commands.DBUpdateSequelizeCommand(
        input,
        mockModel,
        false,
      );
      cmd.dataClause = {}; // simulate empty update clause

      try {
        await cmd.runUpdate();
        throw new Error("Expected BadRequestError not thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal(
          "errMsg_emptyUpdateClauseIsNotAllowedInBulkMode",
        );
      }
    });
  });

  describe("DBUpdateSequelizeCommand.runUpdate (edge cases)", () => {
    it("should skip null results from _updateSilentEachBulkItem", async () => {
      const itemList = [
        { getData: () => ({ id: 1 }) },
        { getData: () => ({ id: 2 }) },
      ];

      const input = { isBulk: true, updateEach: true };
      const model = {
        findAll: sinon.stub().resolves(itemList),
        update: sinon.stub().resolves([1, [null]]), // simulate dbDoc = null
      };

      const cmd = new commands.DBUpdateSequelizeCommand(input, model, false);

      cmd.dataClause = { name: "Ali" };
      cmd._afterItemListInBulkUpdate = async () => {};
      cmd._afterIdListInBulkUpdate = async () => {};
      cmd.silentEachUpdate = true;

      cmd.getDataClauseForEachItem = async () => ({ field: "value" });

      let callCount = 0;
      cmd._updateSilentEachBulkItem = async () => {
        callCount++;
        return callCount === 1 ? 1 : null; // simulate one null
      };

      await cmd.runUpdate();
      expect(cmd.dbData.affectedRows).to.eql([1]); // filters null
    });

    it("should use custom includes returned by buildIncludes", async () => {
      const input = { isBulk: true, updateEach: false };
      const model = {
        findAll: sinon.stub().resolves([{ _id: 1 }, { _id: 2 }]),
        update: sinon.stub().resolves([2, [{ id: 1 }, { id: 2 }]]),
      };

      const cmd = new commands.DBUpdateSequelizeCommand(input, model, false);

      cmd.buildIncludes = () => [{ model: "FakeInclude" }];
      cmd._afterIdListInBulkUpdate = async () => {};
      cmd.dataClause = { name: "Ali" };

      await cmd.runUpdate();

      expect(model.findAll.firstCall.args[0].include).to.eql([
        { model: "FakeInclude" },
      ]);
      expect(cmd.dbData.affectedRows).to.eql([1, 2]);
    });

    it("should execute joinedCriteria logic even if isBulk is false", async () => {
      const input = { isBulk: false };
      const model = {
        findAll: sinon.stub().resolves([{ _id: 10 }]),
        update: sinon.stub().resolves([1, [{ getData: () => ({ id: 10 }) }]]),
        findOne: sinon.stub().resolves({ getData: () => ({ id: 10 }) }),
      };

      const cmd = new commands.DBUpdateSequelizeCommand(input, model, false);

      cmd.joinedCriteria = true;
      cmd._afterIdListInBulkUpdate = async () => {};
      cmd.buildIncludes = () => ["JoinedModel"];
      cmd.dataClause = { name: "Ali" };

      await cmd.runUpdate();

      expect(model.findAll.calledOnce).to.be.true;
      expect(cmd.dbData).to.eql({ id: 10 });
    });
  });
});
