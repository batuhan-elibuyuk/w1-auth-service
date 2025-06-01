const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { status, Metadata } = require("@grpc/grpc-js");

describe("GrpcController", () => {
  let GrpcController;
  let hexaLogger;
  let call, callback;

  beforeEach(() => {
    hexaLogger = {
      insertInfo: sinon.stub(),
      insertError: sinon.stub(),
    };

    GrpcController = proxyquire(
      "../../../src/controllers-layer/grpc-layer/GrpcController.js",
      {
        common: { hexaLogger },
        "@grpc/grpc-js": {
          status,
          Metadata,
        },
      },
    );

    call = {
      request: { requestId: "grpc-req-id", userId: "user-1" },
      call: {
        handler: { path: "/service/addSomething" },
      },
    };
    callback = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should initialize with correct defaults", () => {
    const controller = new GrpcController("addUser", "user", call, callback);
    expect(controller.name).to.equal("addUser");
    expect(controller.routeName).to.equal("user");
    expect(controller._call).to.equal(call);
    expect(controller._callback).to.equal(callback);
    expect(controller.dataName).to.equal("grpcData");
    expect(controller.crudType).to.equal("get");
  });

  it("should log request with _logRequest", async () => {
    const controller = new GrpcController("test", "route", call, callback);
    await controller._logRequest();

    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "GrpcRequestReceived",
        sinon.match.object,
        "route.js->test",
        sinon.match.any,
        "grpc-req-id",
      ),
    ).to.be.true;
  });

  it("should create metadata correctly", () => {
    const controller = new GrpcController("test", "route", call, callback);
    const metadata = controller._createMetadata();

    expect(metadata.get("requestId")[0]).to.equal("grpc-req-id");
    expect(metadata.get("endpoint")[0]).to.equal("/service/addSomething");
    expect(metadata.get("processingTime")[0]).to.be.a("string");
  });

  it("should format response normally", () => {
    const controller = new GrpcController("test", "route", call, callback);
    const result = { name: "john" };
    const formatted = controller._formatResponse(result);
    expect(formatted.item).to.deep.equal(result);
  });

  it("should format response using responseType.create", () => {
    const mockCreate = sinon.stub().returns({ created: true });
    const controller = new GrpcController("test", "route", call, callback);
    controller.responseType = { create: mockCreate };

    const result = { id: 1 };
    const formatted = controller._formatResponse(result);

    expect(mockCreate.calledOnceWith(result)).to.be.true;
    expect(formatted).to.deep.equal({ created: true });
  });

  it("should handle processRequest success", async () => {
    class TestController extends GrpcController {
      async createApiManager() {
        return {
          execute: sinon.stub().resolves({ name: "ok" }),
        };
      }
    }

    const controller = new TestController("test", "route", call, callback);
    await controller.processRequest();

    expect(callback.calledOnce).to.be.true;
    const [error, response, metadata] = callback.firstCall.args;
    expect(error).to.be.null;
    expect(response.item.name).to.equal("ok");
    expect(metadata).to.be.instanceOf(Metadata);
  });

  it("should handle error and map to grpc error", async () => {
    class TestController extends GrpcController {
      async createApiManager() {
        throw Object.assign(new Error("validation failed"), {
          name: "ValidationError",
        });
      }
    }

    const controller = new TestController("test", "route", call, callback);
    await controller.processRequest();

    const [grpcError] = callback.firstCall.args;
    expect(grpcError.code).to.equal(status.INVALID_ARGUMENT);
    expect(grpcError.message).to.equal("validation failed");
    expect(grpcError.details.errorType).to.equal("ValidationError");
  });

  it("should handle deadline exceeded", async () => {
    const deadline = new Date(Date.now() - 1000); // already passed

    call.deadline = deadline;

    class TestController extends GrpcController {
      async createApiManager() {
        return {
          execute: sinon.stub().resolves({}),
        };
      }
    }

    const controller = new TestController("test", "route", call, callback);
    await controller.processRequest();

    const [grpcError] = callback.firstCall.args;
    expect(grpcError.code).to.equal(status.DEADLINE_EXCEEDED);
    expect(grpcError.message).to.equal("Request deadline exceeded");
  });

  it("should default to INTERNAL error if no known error type", async () => {
    class TestController extends GrpcController {
      async createApiManager() {
        throw new Error("Unknown failure");
      }
    }

    const controller = new TestController("test", "route", call, callback);
    await controller.processRequest();

    const [grpcError] = callback.firstCall.args;
    expect(grpcError.code).to.equal(status.INTERNAL);
    expect(grpcError.message).to.equal("Unknown failure");
  });
});
