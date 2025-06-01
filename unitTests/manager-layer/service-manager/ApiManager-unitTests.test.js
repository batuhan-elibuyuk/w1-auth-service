const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("ApiManager", () => {
  let ApiManager, ForbiddenError, NotAuthenticatedError, ErrorCodes;

  beforeEach(() => {
    ForbiddenError = class extends Error {
      constructor(msg, code) {
        super(msg);
        this.code = code;
      }
    };
    NotAuthenticatedError = class extends Error {
      constructor(msg, code) {
        super(msg);
        this.code = code;
      }
    };
    ErrorCodes = {
      LoginRequired: "LoginRequired",
      MobileVerificationNeeded: "MobileVerificationNeeded",
      EmailVerficationNeeded: "EmailVerficationNeeded",
      EmailTwoFactorNeeded: "EmailTwoFactorNeeded",
      MobileTwoFactorNeeded: "MobileTwoFactorNeeded",
    };

    ApiManager = proxyquire(
      "../../../src/manager-layer/service-manager/ApiManager",
      {
        common: {
          createHexCode: () => "generated-id",
          ForbiddenError,
          NotAuthenticatedError,
          ErrorCodes,
        },
      },
    );
  });

  describe("Constructor & Base Properties", () => {
    it("should initialize with proper default values", () => {
      const req = { requestId: "r1", session: {}, headers: {} };
      const manager = new ApiManager(req, {
        name: "X",
        controllerType: "rest",
      });
      expect(manager.requestId).to.equal("r1");
      expect(manager.controllerType).to.equal("rest");
    });

    it("should generate requestId if not present", () => {
      const req = { session: {}, headers: {} };
      const manager = new ApiManager(req, {
        name: "X",
        controllerType: "rest",
      });
      expect(manager.requestId).to.equal("generated-id");
    });
  });

  describe("readPagination", () => {
    it("should correctly parse pagination", () => {
      const req = { pageNumber: "2", pageRowCount: "10", session: {} };
      const manager = new ApiManager(req, {
        name: "Test",
        controllerType: "rest",
        pagination: true,
      });
      manager.defaultPageRowCount = 5;
      manager.readPagination(req);
      expect(manager.pagination).to.deep.equal({
        pageNumber: 2,
        pageRowCount: 10,
      });
    });

    it("should fallback on invalid inputs", () => {
      const req = { pageNumber: "bad", pageRowCount: null, session: {} };
      const manager = new ApiManager(req, {
        name: "Test",
        controllerType: "rest",
        pagination: true,
      });
      manager.defaultPageRowCount = 5;
      manager.readPagination(req);
      expect(manager.pagination).to.deep.equal({
        pageNumber: 1,
        pageRowCount: 5,
      });
    });
    it("should set pagination to null when pageNumber is 0", () => {
      const req = { pageNumber: 0, pageRowCount: 10, session: {} };
      const manager = new ApiManager(req, {
        name: "Test",
        controllerType: "rest",
        pagination: true,
      });
      manager.defaultPageRowCount = 5;
      manager.readPagination(req);
      expect(manager.pagination).to.equal(null);
    });
  });

  describe("readFromContext & readFromSession", () => {
    it("should read from nested properties", () => {
      const manager = new ApiManager(
        { session: {} },
        { name: "X", controllerType: "rest" },
      );
      manager.sample = { nested: { value: 99 } };
      manager.variables = { data: { deep: "yes" } };
      expect(manager.readFromContext("sample.nested.value")).to.equal(99);
      expect(manager.readFromContext("data.deep")).to.equal("yes");
    });

    it("should read from session", () => {
      const manager = new ApiManager(
        { session: { user: { id: 1 } } },
        { name: "X", controllerType: "rest" },
      );
      expect(manager.readFromSession("user.id")).to.equal(1);
    });
    it("should return null from readFromSession if session is undefined", () => {
      const manager = new ApiManager(
        { headers: {}, session: {} },
        { name: "X", controllerType: "rest" },
      );
      delete manager.session;
      const result = manager.readFromSession("any");
      expect(result).to.be.null;
    });
  });

  describe("checkValidLogin", () => {
    it("should throw if session is missing", async () => {
      const manager = new ApiManager(
        { session: {} }, // ✅ ensure session exists
        { name: "X", controllerType: "rest", loginRequired: true },
      );
      delete manager.session.sessionId; // ✅ simulate missing sessionId
      try {
        await manager.checkValidLogin();
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(NotAuthenticatedError);
        expect(err.code).to.equal("LoginRequired");
      }
    });

    it("should throw if mobile not verified", async () => {
      const manager = new ApiManager(
        { session: { sessionId: "s1", mobileVerified: false } },
        { name: "X", controllerType: "rest", loginRequired: true },
      );
      manager.mobileVerificationNeeded = true;
      try {
        await manager.checkValidLogin();
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.code).to.equal("MobileVerificationNeeded");
      }
    });

    it("should pass if login not required", async () => {
      const manager = new ApiManager(
        { session: {} },
        { name: "X", controllerType: "rest", loginRequired: false },
      );
      await manager.checkValidLogin(); // should not throw
    });

    it("should pass if session and sessionId exist", async () => {
      const manager = new ApiManager(
        { session: { sessionId: "s1", mobileVerified: true } },
        { name: "X", controllerType: "rest", loginRequired: true },
      );
      await manager.checkValidLogin(); // should not throw
    });
    it("should call authorizeSharedAccess when shareToken is present", async () => {
      const manager = new ApiManager(
        { shareToken: "abc", session: { sessionId: "1" } },
        { name: "X", controllerType: "rest", loginRequired: false },
      );
      const stub = sinon.stub(manager, "authorizeSharedAccess").resolves(true);
      await manager.checkShareToken();
      expect(stub.calledOnce).to.be.true;
    });

    it("should return error if authorizeSharedAccess returns error", async () => {
      const manager = new ApiManager(
        { shareToken: "abc", session: { sessionId: "1" } },
        { name: "X", controllerType: "rest", loginRequired: false },
      );
      const err = new Error("Access Denied");
      sinon.stub(manager, "authorizeSharedAccess").resolves(err);
      const result = await manager.checkShareToken();
      expect(result).to.equal(err);
    });
  });

  describe("toJSON", () => {
    it("should return base object", () => {
      const req = { requestId: "r1", session: { _USERID: "u1" }, headers: {} };
      const manager = new ApiManager(req, {
        name: "X",
        controllerType: "rest",
      });
      const json = manager.toJSON();
      expect(json).to.include.keys("requestId", "session", "bodyParams");
    });
    it("should call parametersToJson from toJSON", () => {
      const req = { requestId: "r1", session: {}, headers: {} };
      const manager = new ApiManager(req, {
        name: "X",
        controllerType: "rest",
      });

      const spy = sinon.spy(manager, "parametersToJson");
      manager.toJSON();
      expect(spy.calledOnce).to.be.true;
    });
  });

  describe("checkLayer*Auth short-circuiting", () => {
    it("should skip checkLayer1AuthValidations if checkAbsolute returns true", async () => {
      const manager = new ApiManager(
        { session: {} },
        { name: "X", controllerType: "rest" },
      );
      sinon.stub(manager, "checkAbsolute").returns(true);
      const spy = sinon.spy(manager, "checkLayer1AuthValidations");

      await manager.checkLayer1Auth();
      expect(spy.notCalled).to.be.true;
    });

    it("should skip checkLayer5AuthValidations if checkAbsolute returns true", async () => {
      const manager = new ApiManager(
        { session: {} },
        { name: "X", controllerType: "rest" },
      );
      sinon.stub(manager, "checkAbsolute").returns(true);
      const spy = sinon.spy(manager, "checkLayer5AuthValidations");

      await manager.checkLayer5Auth();
      expect(spy.notCalled).to.be.true;
    });
  });

  describe("checkoutUpdated", () => {
    it("should be callable and overrideable", () => {
      const manager = new ApiManager(
        { session: {} },
        { name: "X", controllerType: "rest" },
      );
      const spy = sinon.spy();
      manager.checkoutUpdated = spy;

      manager.checkoutUpdated("completed");
      expect(spy.calledOnceWith("completed")).to.be.true;
    });
  });

  describe("readParameters", () => {
    it("should call correct reader based on controllerType", () => {
      class TestApiManager extends ApiManager {
        constructor(req, options) {
          super(req, options);
          this.readPagination = sinon.spy();
          this.readRestParameters = sinon.spy(); // overridden before .readParameters() runs
        }
      }

      const req = { pageNumber: 1, pageRowCount: 10, session: {} };

      const manager = new TestApiManager(req, {
        name: "X",
        controllerType: "rest",
        pagination: true,
      });

      manager.readParameters(req);

      expect(manager.readPagination.calledOnce).to.be.true;
      expect(manager.readRestParameters.calledOnce).to.be.true;
    });

    describe("doDownload", () => {
      it("should write JSON response with headers if downloadName is default", async () => {
        const res = {
          setHeader: sinon.spy(),
          write: sinon.spy(),
          end: sinon.spy(),
        };

        const manager = new ApiManager(
          { headers: {}, session: {} },
          {
            name: "X",
            controllerType: "rest",
          },
        );

        manager.downloadName = "default";
        manager.controllerType = "rest";
        manager.dataName = "data";
        manager.output = { test: "value" };

        const result = await manager.doDownload(res);

        expect(res.setHeader.calledWith("Content-Type", "application/json")).to
          .be.true;
        expect(res.setHeader.calledWithMatch("Content-Disposition")).to.be.true;
        expect(res.write.calledOnce).to.be.true;
        expect(res.end.calledOnce).to.be.true;
        expect(result).to.be.true;
      });

      it("should return false if downloadName is not default", async () => {
        const res = {
          setHeader: sinon.spy(),
          write: sinon.spy(),
          end: sinon.spy(),
        };

        const manager = new ApiManager(
          { headers: {}, session: {} },
          {
            name: "X",
            controllerType: "rest",
          },
        );

        manager.downloadName = "other";
        const result = await manager.doDownload(res);
        expect(result).to.be.false;
      });
    });
  });

  describe("ApiManager - execute lifecycle", () => {
    it("should run full execute() lifecycle successfully", async () => {
      const req = { session: { sessionId: "abc", _USERID: "u1" }, headers: {} };
      const manager = new ApiManager(req, {
        name: "Test",
        controllerType: "rest",
        crudType: "get",
      });

      // Stub all lifecycle dependencies
      sinon.stub(manager, "checkValidLogin").resolves();
      sinon.stub(manager, "readParameters").returns();
      sinon.stub(manager, "executeLayer1").resolves();
      sinon.stub(manager, "executeLayer2").resolves();
      sinon.stub(manager, "executeLayer3").resolves();
      sinon.stub(manager, "executeLayer4").resolves();
      sinon.stub(manager, "executeLayer5").resolves();
      sinon.stub(manager, "buildOutput").resolves();
      sinon.stub(manager, "raiseEvent").returns();

      const result = await manager.execute();
      expect(result).to.equal(manager.output);
    });

    it("should run mainOperation() for getList and transform dbResult", async () => {
      const req = { session: { sessionId: "abc" }, headers: {} };
      const manager = new ApiManager(req, {
        name: "Test",
        controllerType: "rest",
        crudType: "getList",
      });

      manager.dataName = "orders";
      manager.doBusiness = async () => ({
        items: [{ id: 1 }, { id: 2 }],
        paging: { total: 2 },
        filters: {},
        uiPermissions: [],
        _source: {},
        _cacheKey: "c1",
      });

      await manager.mainOperation();

      expect(manager.dbResult.items).to.have.length(2);
      expect(manager.orders).to.deep.equal(manager.dbResult.items);
    });

    it("should build correct output object", async () => {
      const req = {
        session: { sessionId: "abc", _USERID: "u1" },
        headers: {},
      };
      const manager = new ApiManager(req, {
        name: "Test",
        controllerType: "rest",
        crudType: "getList",
      });

      manager.dataName = "orders";
      manager.httpMethod = "GET";
      manager.statusCode = 200;
      manager.dbResult = {
        items: [{ id: 1 }, { id: 2 }],
        paging: { total: 2 },
        filters: {},
        uiPermissions: [],
        _source: { meta: "ok" },
        _cacheKey: "key123",
      };
      manager.startTime = Date.now() - 10;

      sinon.stub(manager, "addToOutput").resolves();
      sinon.stub(manager, "createResponseTokens").returns();

      await manager.buildOutput();

      expect(manager.output.status).to.equal("OK");
      expect(manager.output.orders).to.have.length(2);
      expect(manager.output.appVersion).to.be.undefined;
      expect(manager.output.userId).to.equal("u1");
    });
    it("should call checkSessionInvalidates in executeLayer5", async () => {
      const manager = new ApiManager(
        { session: {} },
        {
          name: "X",
          controllerType: "rest",
          crudType: "update",
        },
      );

      manager.dataName = "product";
      sinon.stub(manager, "doBusiness").resolves({ id: 1 });
      sinon.stub(manager, "executeAggregatedCruds").resolves();
      sinon.stub(manager, "setLayer5Variables").resolves();
      sinon.stub(manager, "checkLayer5Auth").resolves();
      sinon.stub(manager, "checkLayer5BusinessValidations").resolves();
      const invalidateSpy = sinon
        .stub(manager, "checkSessionInvalidates")
        .resolves();

      await manager.executeLayer5();
      expect(invalidateSpy.calledOnce).to.be.true;
    });
  });
});
