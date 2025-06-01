const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

//these tests will work when DbGetUserCommand is exported from main code

describe("DbGetUserCommand", () => {
  let DbGetUserCommand, dbGetUser;
  let sandbox, UserStub, BaseCommandStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    UserStub = {
      getCqrsJoins: sandbox.stub().resolves(),
    };

    BaseCommandStub = class {
      constructor(input, model) {
        this.input = input;
        this.model = model;
        this.session = input.session;
        this.requestId = input.requestId;
        this.dataClause = input.dataClause || {};
        this.dbData = { id: input.userId || 101 };
      }

      async execute() {
        return this.dbData;
      }

      loadHookFunctions() {}
      initOwnership() {}
      createEntityCacher() {}
    };

    ({ DbGetUserCommand, dbGetUser } = proxyquire(
      "../../../../src/db-layer/main/user/dbGetUser",
      {
        models: { User: UserStub },
        dbCommand: {
          DBGetSequelizeCommand: BaseCommandStub,
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
    it("should set command metadata correctly", () => {
      const cmd = new DbGetUserCommand({});
      expect(cmd.commandName).to.equal("dbGetUser");
      expect(cmd.objectName).to.equal("user");
      expect(cmd.serviceLabel).to.equal("w-auth-service");
      expect(cmd.nullResult).to.be.false;
    });
  });

  describe("getCqrsJoins", () => {
    it("should call User.getCqrsJoins if exists", async () => {
      const cmd = new DbGetUserCommand({});
      await cmd.getCqrsJoins({ test: true });
      sinon.assert.calledOnce(UserStub.getCqrsJoins);
    });

    it("should skip getCqrsJoins if method is missing", async () => {
      delete UserStub.getCqrsJoins;
      const cmd = new DbGetUserCommand({});
      let errorThrown = false;
      try {
        await cmd.getCqrsJoins({});
      } catch (err) {
        errorThrown = true;
      }

      expect(errorThrown).to.be.false;
    });
  });

  describe("buildIncludes", () => {
    it("should return [] includes", () => {
      const cmd = new DbGetUserCommand({});
      const result = cmd.buildIncludes(true);
      expect(result).to.deep.equal([]);
    });

    it("should return [] includes even if getJoins is absent", () => {
      const cmd = new DbGetUserCommand({}); // input.getJoins is undefined
      const result = cmd.buildIncludes(false);
      expect(result).to.deep.equal([]);
    });
  });

  describe("dbGetUser", () => {
    it("should execute dbGetUser and return user data", async () => {
      const result = await dbGetUser({
        userId: 777,
        session: "sess",
        requestId: "req",
      });

      expect(result).to.deep.equal({ id: 777 });
    });
  });
});
