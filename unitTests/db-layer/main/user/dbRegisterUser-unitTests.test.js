const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

//these tests will work when DbRegisterUserCommand is exported from main code
describe("DbRegisterUserCommand", () => {
  let DbRegisterUserCommand, dbRegisterUser;
  let sandbox, UserStub, ElasticIndexerStub, getUserByIdStub, BaseCommandStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    UserStub = {
      findByPk: sandbox.stub(),
      create: sandbox.stub(),
    };

    getUserByIdStub = sandbox.stub().resolves({ id: 1, name: "Mock Client" });

    ElasticIndexerStub = sandbox.stub().returns({
      indexData: sandbox.stub().resolves(),
    });

    BaseCommandStub = class {
      constructor(input) {
        this.input = input;
        this.dataClause = input.dataClause || {};
        this.session = input.session;
        this.requestId = input.requestId;
        this.dbData = { id: 9 };
      }

      async runDbCommand() {}
      async execute() {
        return this.dbData;
      }
      loadHookFunctions() {}
      createEntityCacher() {}
      normalizeSequalizeOps(w) {
        return w;
      }
      createQueryCacheInvalidator() {}
    };

    ({ DbRegisterUserCommand, dbRegisterUser } = proxyquire(
      "../../../../src/db-layer/main/user/dbRegisterUser",
      {
        models: { User: UserStub },
        serviceCommon: { ElasticIndexer: ElasticIndexerStub },
        "./utils/getUserById": getUserByIdStub,
        dbCommand: { DBCreateSequelizeCommand: BaseCommandStub },
        "./query-cache-classes": {
          ClientQueryCacheInvalidator: sandbox.stub(),
        },
        common: {
          HttpServerError: class extends Error {
            constructor(msg, details) {
              super(msg);
              this.details = details;
            }
          },
        },
      },
    ));
  });

  afterEach(() => sandbox.restore());

  describe("constructor", () => {
    it("should assign initial properties", () => {
      const cmd = new DbRegisterUserCommand({});
      expect(cmd.commandName).to.equal("dbRegisterUser");
      expect(cmd.objectName).to.equal("user");
      expect(cmd.serviceLabel).to.equal("w-auth-service");
      expect(cmd.dbEvent).to.equal("w1-auth-service-dbevent-user-created");
    });
  });

  describe("indexDataToElastic", () => {
    it("should call getUserById and indexData", async () => {
      const cmd = new DbRegisterUserCommand({
        session: "session-id",
        requestId: "req-123",
      });
      cmd.dbData = { id: 1 };

      await cmd.indexDataToElastic();

      sinon.assert.calledWith(getUserByIdStub, 1);
      sinon.assert.calledOnce(ElasticIndexerStub);
      sinon.assert.calledOnce(ElasticIndexerStub().indexData);
    });
  });

  /* describe("runDbCommand", () => {
    

    it("should update existing user if found by unique index", async () => {
      const updateStub = sandbox.stub().resolves();
      const mockuser = { update: updateStub, getData: () => ({ id: 2 }) };

      UserStub.findOne = sandbox.stub().resolves(mockuser);
      UserStub.findByPk = sandbox.stub().resolves(null);

      const input = {
        dataClause: {
          
          id: "id_value",
          
          name: "updated"
        },
        checkoutResult: {}
      };

      const cmd = new DbRegisterUserCommand(input);
      await cmd.runDbCommand();

      expect(input.user).to.deep.equal({ id: 2 });
      sinon.assert.calledOnce(updateStub);
    });

    it("should create new user if no unique match is found", async () => {
      UserStub.findOne = sandbox.stub().resolves(null);
      UserStub.findByPk = sandbox.stub().resolves(null);
      UserStub.create.resolves({
        getData: () => ({ id: 5, name: "new" }),
      });

      const input = {
        dataClause: {
          
          name: "name_value",
          
          name: "new"
        }
      };

      const cmd = new DbRegisterUserCommand(input);
      await cmd.runDbCommand();

      expect(input.user).to.deep.equal({ id: 5, name: "new" });
      sinon.assert.calledOnce(UserStub.create);
    });

    it("should throw HttpServerError on Sequelize update failure", async () => {
      UserStub.findByPk.rejects(new Error("Update failed"));

      const input = {
        dataClause: { id: 3 },
        checkoutResult: {},
      };

      const cmd = new DbRegisterUserCommand(input);

      try {
        await cmd.runDbCommand();
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.include("Error in checking unique index");
      }
    });
  });*/ //// go back to fix

  describe("dbRegisterUser", () => {
    it("should execute successfully and return dbData", async () => {
      UserStub.create.resolves({ getData: () => ({ id: 9 }) });

      const input = { dataClause: { name: "user" } };
      const result = await dbRegisterUser(input);

      expect(result).to.deep.equal({ id: 9 });
    });
  });
});
