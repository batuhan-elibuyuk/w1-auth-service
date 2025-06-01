const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("RestController", () => {
  let RestController;
  let hexaLogger;
  let req, res, next;

  beforeEach(() => {
    hexaLogger = {
      insertInfo: sinon.stub(),
      insertError: sinon.stub(),
    };

    RestController = proxyquire(
      "../../../src/controllers-layer/rest-layer/RestController.js",
      {
        common: { hexaLogger },
      },
    );

    req = { requestId: "req-123" };
    res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
      redirect: sinon.stub(),
      cookie: sinon.stub(),
    };
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should initialize with correct default values", () => {
    const controller = new RestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );

    expect(controller.name).to.equal("testFunc");
    expect(controller.routeName).to.equal("testRoute");
    expect(controller._req).to.equal(req);
    expect(controller._res).to.equal(res);
    expect(controller._next).to.equal(next);
    expect(controller.crudType).to.equal("get");
    expect(controller.status).to.equal(200);
    expect(controller.dataName).to.equal("resData");
    expect(controller.requestId).to.equal("req-123");
  });

  it("should call _logRequest with request data", async () => {
    const controller = new RestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    await controller._logRequest();

    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "RestRequestReceived",
        sinon.match.object,
        "testRoute.js->testFunc",
        sinon.match.object,
        "req-123",
      ),
    ).to.be.true;
  });

  it("should call _logResponse with response data", async () => {
    const controller = new RestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    controller.response = { message: "done" };
    await controller._logResponse();

    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "RestRequestResponded",
        sinon.match.object,
        "testRoute.js->testFunc",
        sinon.match.object,
        "req-123",
      ),
    ).to.be.true;
  });

  it("should call _logManagerCreateError on apiManager init error", async () => {
    class TestController extends RestController {
      async createApiManager() {
        throw new Error("manager error");
      }
    }

    const controller = new TestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    await controller.processRequest();

    expect(
      hexaLogger.insertError.calledWithMatch(
        "RestRequestManagerCreateError",
        sinon.match.has("function", "testFunc"),
        "testRoute.js->testFunc",
        sinon.match.any,
        "req-123",
      ),
    ).to.be.true;
    expect(next.calledOnce).to.be.true;
  });

  it("should execute request and send response", async () => {
    const executeStub = sinon.stub().resolves({ data: "ok" });
    const doDownloadStub = sinon.stub().resolves(false);

    class TestController extends RestController {
      async createApiManager() {
        return {
          execute: executeStub,
          doDownload: doDownloadStub,
        };
      }

      async redirect() {
        return false;
      }
    }

    const controller = new TestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );

    await controller.processRequest();

    expect(doDownloadStub.calledOnceWith(res)).to.be.true;
    expect(res.status.calledWith(200)).to.be.true;
    expect(res.send.calledWithMatch(sinon.match({ data: "ok" }))).to.be.true;

    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "RestRequestResponded",
        sinon.match.any,
        "testRoute.js->testFunc",
        sinon.match.any,
        "req-123",
      ),
    ).to.be.true;
  });

  it("should set cookie if apiManager.setCookie exists", async () => {
    class TestController extends RestController {
      async createApiManager() {
        return {
          execute: sinon.stub().resolves({ done: true }),
          setCookie: {
            cookieName: "sessionId",
            cookieValue: "abc123",
          },
        };
      }
    }

    process.env.COOKIE_URL = "example.com";

    const controller = new TestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    await controller.processRequest();

    expect(
      res.cookie.calledWith("sessionId", "abc123", {
        httpOnly: true,
        domain: "example.com",
        sameSite: "None",
        secure: true,
      }),
    ).to.be.true;
  });

  it("should redirect if redirectUrl is defined", async () => {
    class TestController extends RestController {
      async createApiManager() {
        return {
          execute: sinon.stub().resolves({}),
          redirectUrl: "https://redirect.me",
        };
      }
    }

    const controller = new TestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    await controller.processRequest();

    expect(res.redirect.calledWith("https://redirect.me")).to.be.true;
  });

  it("redirect() should return false if no redirectUrl is set", async () => {
    const controller = new RestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    controller.apiManager = {}; // no redirectUrl
    const result = await controller.redirect();
    expect(result).to.be.false;
    expect(res.redirect.called).to.be.false;
  });

  it("should call doDownload if applicable", async () => {
    const doDownloadStub = sinon.stub().resolves(true);

    class TestController extends RestController {
      async createApiManager() {
        return {
          execute: sinon.stub().resolves({}),
          doDownload: doDownloadStub,
        };
      }
    }

    const controller = new TestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    await controller.processRequest();

    expect(doDownloadStub.calledOnce).to.be.true;
  });

  it("doDownload() should throw if apiManager has no doDownload method", async () => {
    const controller = new RestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    controller.apiManager = {};
    try {
      await controller.doDownload();
    } catch (err) {
      expect(err).to.be.instanceOf(TypeError);
    }
  });

  //reopen this test when this._logError(err) is uncommented in the RestController
  /*it("should handle and log error during execution", async () => {
    class TestController extends RestController {
      async createApiManager() {
        return {
          execute: sinon.stub().rejects(new Error("exec failed")),
        };
      }
    }

    const controller = new TestController(
      "testFunc",
      "testRoute",
      req,
      res,
      next,
    );
    await controller.processRequest();
    expect(next.calledOnce).to.be.true;
  });*/
});
