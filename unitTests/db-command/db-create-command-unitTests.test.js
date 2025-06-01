const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("DBCreate Commands", () => {
  let DBCreateMongooseCommand, DBCreateSequelizeCommand;
  let input;

  beforeEach(() => {
    input = {
      session: { userId: "test-user" },
      auth: {},
      getDataClause: sinon.stub().returns({}),
      getWhereClause: sinon.stub().returns({}),
    };

    const DbCommandStub = class {
      constructor(inputArg) {
        this.input = inputArg;
        this.session = inputArg.session;
        this.auth = inputArg.auth;
        this.dbData = { id: 1 };

        this.queryCacheInvalidator = {
          invalidateCache: sinon.stub(),
        };

        this.entityCacher = {
          saveEntityToCache: sinon.stub().resolves(),
        };

        this.indexDataToElastic = sinon.stub().resolves();
      }

      async buildWhereClause() {}
      async create_childs() {}
      async afterInstance() {}
    };

    const {
      DBCreateMongooseCommand: RawMongoose,
      DBCreateSequelizeCommand: RawSequelize,
    } = proxyquire("../../src/db-command/db-create-command.js", {
      "../../src/db-command/db-command.js": DbCommandStub,
    });

    DBCreateMongooseCommand = RawMongoose;
    DBCreateSequelizeCommand = RawSequelize;
  });

  it("should instantiate DBCreateMongooseCommand with input/session/auth", () => {
    const cmd = new DBCreateMongooseCommand(input);
    expect(cmd.input).to.equal(input);
    expect(cmd.session.userId).to.equal("test-user");
  });

  it("should instantiate DBCreateSequelizeCommand with input/session/auth", () => {
    const cmd = new DBCreateSequelizeCommand(input);
    expect(cmd.input).to.equal(input);
    expect(cmd.auth).to.equal(input.auth);
  });

  it("should execute postCommand with all operations (Mongoose)", async () => {
    const cmd = new DBCreateMongooseCommand(input);
    const result = await cmd.postCommand();

    expect(cmd.queryCacheInvalidator.invalidateCache.calledWith(cmd.dbData)).to
      .be.true;
    expect(cmd.entityCacher.saveEntityToCache.calledWith(cmd.dbData)).to.be
      .true;
    expect(cmd.indexDataToElastic.calledOnce).to.be.true;
    expect(result).to.be.false;
  });

  it("should execute postCommand with all operations (Sequelize)", async () => {
    const cmd = new DBCreateSequelizeCommand(input);
    const result = await cmd.postCommand();

    expect(cmd.queryCacheInvalidator.invalidateCache.calledWith(cmd.dbData)).to
      .be.true;
    expect(cmd.entityCacher.saveEntityToCache.calledWith(cmd.dbData)).to.be
      .true;
    expect(cmd.indexDataToElastic.calledOnce).to.be.true;
    expect(result).to.be.false;
  });
});
