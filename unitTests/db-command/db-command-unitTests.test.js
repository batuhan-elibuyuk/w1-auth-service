const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { Op } = require("sequelize");
const { HttpError, HttpServerError } = require("common");

describe("DbCommand", () => {
  let DbCommand;
  let ServicePublisherStub;
  let input;

  beforeEach(() => {
    input = {
      ignoreElasticIndex: ["User", "Product"],
      session: { userId: "u1" },
      auth: { token: "abc" },
      checkoutResult: "checkout-done",
    };

    ServicePublisherStub = sinon.stub().callsFake(function () {
      this.publish = sinon.stub();
    });

    DbCommand = proxyquire("../../src/db-command/db-command.js", {
      serviceCommon: {
        ServicePublisher: ServicePublisherStub,
      },
      hookFunctions: {
        sampleHook: () => "result",
        errorHook: () => new Error("hook failed"),
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("constructor() should normalize ignoreElasticIndex to lowercase array", () => {
    sinon.stub(DbCommand.prototype, "loadHookFunctions").callsFake(() => {});
    const cmd = new DbCommand({ ...input, ignoreElasticIndex: "User" });
    expect(cmd.input.ignoreElasticIndex).to.eql(["user"]);
    expect(cmd.session.userId).to.equal("u1");
    expect(cmd.auth.token).to.equal("abc");
    expect(cmd.commandName).to.equal("DbCommand");
  });

  it("normalizeSequalizeOps() should convert Sequelize Op symbols to $op.* keys", () => {
    sinon.stub(DbCommand.prototype, "loadHookFunctions").callsFake(() => {});
    const cmd = new DbCommand(input);

    const whereClause = {
      name: "test",
      [Op.eq]: 5,
      nested: {
        [Op.in]: [1, 2],
      },
    };

    const result = cmd.normalizeSequalizeOps(whereClause);
    expect(result["$op.eq"]).to.equal(5);
    expect(result.nested["$op.in"]).to.eql([1, 2]);
  });

  it("execute() should return result from endCommand()", async () => {
    sinon.stub(DbCommand.prototype, "loadHookFunctions").callsFake(() => {});
    class TestCmd extends DbCommand {
      async createEntityCacher() {}
      async createQueryCacheInvalidator() {}
      async beginCommand() {}
      async buildCommandClauses() {}
      async commandMain() {}
      async endCommand() {
        return "endData";
      }
    }
    const cmd = new TestCmd(input);
    const result = await cmd.execute();
    expect(result).to.equal("endData");
  });

  it("execute() should return early if beginCommand() returns early result", async () => {
    sinon.stub(DbCommand.prototype, "loadHookFunctions").callsFake(() => {});
    class TestCmd extends DbCommand {
      async beginCommand() {
        return "beginResult";
      }
    }
    const cmd = new TestCmd(input);
    const result = await cmd.execute();
    expect(result).to.equal("beginResult");
  });

  it("execute() should throw HttpServerError when error is not HttpError", async () => {
    sinon.stub(DbCommand.prototype, "loadHookFunctions").callsFake(() => {});
    class TestCmd extends DbCommand {
      async buildCommandClauses() {
        throw new Error("DB FAIL");
      }
    }
    const cmd = new TestCmd(input);
    try {
      await cmd.execute();
    } catch (err) {
      expect(err.message).to.include("errMsg_dbErrorWhenExecuting_");
      expect(err.detail.checkoutResult).to.equal("checkout-done");
    }
  });

  it("raiseDbEvent() should call ServicePublisher.publish()", async () => {
    sinon.stub(DbCommand.prototype, "loadHookFunctions").callsFake(() => {});
    class TestCmd extends DbCommand {
      constructor(...args) {
        super(...args);
        this.dbEvent = "user.created";
        this.dbData = { id: 1 };
      }
    }
    const cmd = new TestCmd(input);
    await cmd.raiseDbEvent();
    expect(ServicePublisherStub.calledOnce).to.be.true;
    expect(ServicePublisherStub.firstCall.returnValue.publish.calledOnce).to.be
      .true;
  });

  it("raiseDbEvent() should log error when publish throws", async () => {
    const ServicePublisherMock = sinon.stub().callsFake(function () {
      this.publish = sinon.stub().throws(new Error("fail"));
    });

    const DbCommandWithMock = proxyquire("../../src/db-command/db-command.js", {
      serviceCommon: { ServicePublisher: ServicePublisherMock },
    });

    class TestCmd extends DbCommandWithMock {
      constructor(...args) {
        super(...args);
        this.dbEvent = "test";
        this.dbData = { id: 99 };
      }
    }

    const spy = sinon.spy(console, "log");
    const cmd = new TestCmd(input);
    await cmd.raiseDbEvent();
    expect(spy.calledWithMatch("DbEvent cant be published")).to.be.true;
    spy.restore();
  });

  it("runHookFunctions() should return the first non-null result", () => {
    class TestCmd extends DbCommand {
      loadHookFunctions() {}
    }
    const cmd = new TestCmd(input);
    const result = cmd.runHookFunctions(
      "testHook",
      [() => null, () => "success"],
      [],
    );
    expect(result).to.equal("success");
  });

  it("runHookFunctions() should return null if hook throws", () => {
    class TestCmd extends DbCommand {
      loadHookFunctions() {}
    }
    const cmd = new TestCmd(input);
    const result = cmd.runHookFunctions(
      "testHook",
      [
        () => {
          throw new Error("fail");
        },
      ],
      [],
    );
    expect(result).to.be.null;
  });

  it("runHookFunctions() should return null if hook returns Error instance", () => {
    class TestCmd extends DbCommand {
      loadHookFunctions() {}
    }
    const cmd = new TestCmd(input);
    const result = cmd.runHookFunctions(
      "testHook",
      [() => new Error("bad")],
      [],
    );
    expect(result).to.be.null;
  });

  it("buildWhereClause() should assign whereClause from input", async () => {
    input.getWhereClause = sinon.stub().resolves({ id: 5 });
    class TestCmd extends DbCommand {
      constructor(...args) {
        super(...args);
        this.loadHookFunctions = () => {};
      }
    }
    const cmd = new TestCmd(input);
    await cmd.buildWhereClause(input);
    expect(cmd.whereClause).to.eql({ id: 5 });
  });

  it("buildDataClause() should use _afterDataClause to modify dataClause", async () => {
    input.getDataClause = () => ({ age: 30 });
    class TestCmd extends DbCommand {
      constructor(...args) {
        super(...args);
        this.loadHookFunctions = () => {};
      }
      async _afterDataClause(inputArg, clause) {
        clause.verified = true;
        return clause;
      }
    }
    const cmd = new TestCmd(input);
    await cmd.buildDataClause(input);
    expect(cmd.dataClause).to.eql({ age: 30, verified: true });
  });

  it("endCommand() should call transposeResult with dbData", async () => {
    class TestCmd extends DbCommand {
      constructor(...args) {
        super(...args);
        this.loadHookFunctions = () => {};
        this.dbData = { id: 123 };
      }
      async transposeResult(data) {
        expect(data).to.eql({ id: 123 });
      }
      async runPostHooks() {}
      async postCommand() {}
      async raiseDbEvent() {}
    }
    const cmd = new TestCmd(input);
    await cmd.endCommand();
  });

  it("getData() should return null", () => {
    class TestCmd extends DbCommand {
      constructor(...args) {
        super(...args);
        this.loadHookFunctions = () => {};
      }
    }
    const cmd = new TestCmd(input);
    expect(cmd.getData()).to.be.null;
  });

  it("loadHookFunctions() should handle missing hookFunctions module gracefully", () => {
    const spy = sinon.spy(console, "log");

    class BrokenDbCommand extends DbCommand {
      loadHookFunctions() {
        try {
          throw new Error("Simulated failure");
        } catch (err) {
          console.log("Error in loading hook functions index", err);
        }
      }
    }

    new BrokenDbCommand(input); // constructor triggers loadHookFunctions()

    expect(spy.calledWithMatch("Error in loading hook functions index")).to.be
      .true;
    spy.restore();
  });

  it("readFromContext() should return value from input by key", () => {
    class TestCmd extends DbCommand {
      loadHookFunctions() {}
    }
    const cmd = new TestCmd(input);
    expect(cmd.readFromContext("checkoutResult")).to.equal("checkout-done");
  });

  it("readFromSession() should return value from session by key or null", () => {
    class TestCmd extends DbCommand {
      loadHookFunctions() {}
    }
    const cmd = new TestCmd(input);
    console.log(cmd.readFromSession("userId"));
    console.log(cmd.readFromSession("nonexistent"));
    expect(cmd.readFromSession("userId")).to.equal("u1");
    expect(cmd.readFromSession("nonexistent")).to.equal(null);
  });

  it("initOwnership() should set checkOwner to false", () => {
    class TestCmd extends DbCommand {
      loadHookFunctions() {}
    }
    const cmd = new TestCmd(input);
    expect(cmd.checkOwner).to.be.false;
  });

  it("commandMain() should call preCommand and runDbCommand", async () => {
    class TestCmd extends DbCommand {
      constructor(...args) {
        super(...args);
        this.loadHookFunctions = () => {};
      }
      async preCommand() {
        this.sequence = ["pre"];
        return;
      }
      async runDbCommand() {
        this.sequence.push("db");
      }
    }
    const cmd = new TestCmd(input);
    await cmd.commandMain();
    expect(cmd.sequence).to.eql(["pre", "db"]);
  });
});
