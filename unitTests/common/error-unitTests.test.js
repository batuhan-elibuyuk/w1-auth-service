const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const {
  errorHandler,
  HttpError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  HttpServerError,
  PaymentGateError,
  ErrorCodes,
} = require("../../src/common/error");

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should serialize basic error", () => {
      const err = new HttpError(
        500,
        "Something failed",
        ErrorCodes.UnknownError,
        { debug: true },
      );
      const output = err.serializeError();
      expect(output).to.include({
        result: "ERR",
        status: 500,
        message: "Something failed",
        errCode: ErrorCodes.UnknownError,
      });
      expect(output.date).to.be.a("string");
    });
  });

  describe("HttpError subclasses", () => {
    it("should return 404 for NotFoundError", () => {
      const err = new NotFoundError("Not Found", ErrorCodes.StepNotFound);
      expect(err.status).to.equal(404);
      expect(err.serializeError().status).to.equal(404);
    });

    it("should return 401 for NotAuthenticatedError", () => {
      const err = new NotAuthenticatedError(
        "Unauthorized",
        ErrorCodes.LoginRequired,
      );
      expect(err.status).to.equal(401);
    });

    it("should return 403 for ForbiddenError", () => {
      const err = new ForbiddenError(
        "Access denied",
        ErrorCodes.ForbiddenAccess,
      );
      expect(err.status).to.equal(403);
    });

    it("should return 400 for BadRequestError", () => {
      const err = new BadRequestError("Bad input", ErrorCodes.ParameterError);
      expect(err.status).to.equal(400);
    });

    it("should default to 500 for HttpServerError", () => {
      const err = new HttpServerError("Internal fail");
      expect(err.status).to.equal(500);
    });

    it("should set errorCode to 0 for HttpServerError", () => {
      const err = new HttpServerError("fail", { cause: "server" });
      const serialized = err.serializeError();
      expect(serialized.errCode).to.equal(0);
    });
  });

  describe("PaymentGateError", () => {
    it("should prepend paymentGateName to message", () => {
      const err = new PaymentGateError(
        "stripe",
        "timeout",
        ErrorCodes.UnknownError,
      );
      const result = err.serializeError();
      expect(result.message).to.include("stripe error: timeout");
    });
    it("should retain detail on PaymentGateError", () => {
      const err = new PaymentGateError("stripe", "timeout", "PayErr", {
        code: "TIMEOUT",
      });
      const serialized = err.serializeError();
      expect(serialized.detail).to.deep.equal({ code: "TIMEOUT" });
    });
  });
});

describe("Error Handler Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { requestId: "abc123" };
    res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    next = sinon.stub();
    sinon.stub(console, "log");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle AppError and respond with serialized output", () => {
    const err = new NotAuthenticatedError("unauth", ErrorCodes.LoginRequired);
    errorHandler(err, req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.send.calledOnce).to.be.true;
    const payload = res.send.firstCall.args[0];
    expect(payload.message).to.equal("unauth");
  });

  it("should handle generic Error object", () => {
    const err = new Error("unknown crash");
    errorHandler(err, req, res, next);
    expect(res.status.calledWith(500)).to.be.true;
    const payload = res.send.firstCall.args[0];
    expect(payload.message).to.equal("unknown crash");
    expect(payload.status).to.equal(500);
  });

  it("should call hexaLogger.insertError with correct logObject", () => {
    const insertErrorStub = sinon.stub().resolves();
    const mockedLogger = {
      insertError: insertErrorStub,
    };
    const fakeError = new ForbiddenError(
      "Denied",
      ErrorCodes.ForbiddenAccess,
      new Error("Nested"),
    );

    const errorModule = proxyquire("../../src/common/error", {
      "../common/hexa-logger": {
        hexaLogger: mockedLogger,
        HexaLogTypes: { HttpError: "HttpError" },
      },
    });

    const req = { requestId: "req-1" };
    const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
    errorModule.errorHandler(fakeError, req, res);

    expect(insertErrorStub.calledOnce).to.be.true;
    const [type, , location, logObj, requestId] =
      insertErrorStub.firstCall.args;
    expect(type).to.equal("HttpError");
    expect(location).to.include("error.js->errorHandler");
    expect(requestId).to.equal("req-1");
    expect(logObj.HTTPError.message).to.equal("Denied");
  });

  it("should include detail if it's not an Error object", () => {
    const err = new BadRequestError("bad", ErrorCodes.ParameterError, {
      info: "extra",
    });
    errorHandler(err, req, res, next);
    const response = res.send.firstCall.args[0];
    expect(response.detail).to.deep.equal({ info: "extra" });
  });

  it("should not crash if hexaLogger.insertError throws", () => {
    const err = new HttpServerError("fatal");
    const faultyLogger = {
      insertError: () => {
        throw new Error("log fail");
      },
    };

    const module = proxyquire("../../src/common/error", {
      "../common/hexa-logger": {
        hexaLogger: faultyLogger,
        HexaLogTypes: { HttpError: "HttpError" },
      },
    });

    const resMock = { status: sinon.stub().returnsThis(), send: sinon.stub() };
    expect(() => module.errorHandler(err, req, resMock)).to.not.throw();
  });
});
