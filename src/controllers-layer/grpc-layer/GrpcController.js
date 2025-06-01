const { hexaLogger } = require("common");
const { status } = require("@grpc/grpc-js");
const grpc = require("@grpc/grpc-js");

const GrpcErrorMap = {
  ValidationError: status.INVALID_ARGUMENT,
  NotFoundError: status.NOT_FOUND,
  AlreadyExistsError: status.ALREADY_EXISTS,
  AuthenticationError: status.UNAUTHENTICATED,
  PermissionError: status.PERMISSION_DENIED,
};

class GrpcController {
  constructor(name, routeName, call, callback) {
    this.name = name;
    this.routeName = routeName;
    this.apiManager = null;
    this.response = {};
    this.businessOutput = null;
    this.crudType = "get";
    this.dataName = "grpcData";

    this._call = call;
    this._callback = callback;
    this.requestId = call.request.requestId;
    this.startTime = Date.now();
    this.responseType = null;
  }

  async createApiManager() {}

  async _logManagerCreateError(err) {
    hexaLogger.insertError(
      "GrpcRequestManagerCreateError",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      err,
      this.requestId,
    );
  }

  async _logRequest() {
    hexaLogger.insertInfo(
      "GrpcRequestReceived",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      this._call.request,
      this.requestId,
    );
  }

  async _logResponse() {
    hexaLogger.insertInfo(
      "GrpcRequestResponded",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      this.response,
      this.requestId,
    );
  }

  async _logError(err) {
    hexaLogger.insertError(
      "ErrorInGrpcRequest",
      { function: this.name, err: err.message },
      `${this.routeName}.js->${this.name}`,
      err,
      this.requestId,
    );
  }

  _createMetadata() {
    const metadata = new grpc.Metadata();
    metadata.set("requestId", this.requestId);
    metadata.set("processingTime", (Date.now() - this.startTime).toString());
    metadata.set("endpoint", this._call.call.handler.path);
    return metadata;
  }

  _formatResponse(result) {
    if (!result) {
      throw new Error(`Invalid result in ${this.name}`);
    }

    if (this.responseType) {
      return this.responseType.create(result);
    }

    return { item: JSON.parse(JSON.stringify(result)) };
  }

  async processRequest() {
    await this._logRequest();

    try {
      if (this._call.deadline && Date.now() > this._call.deadline.getTime()) {
        throw {
          name: "DeadlineExceededError",
          message: "Request deadline exceeded",
          grpcCode: status.DEADLINE_EXCEEDED,
        };
      }

      this.apiManager = await this.createApiManager();
      this.response = await this.apiManager.execute();
      const formattedResponse = this._formatResponse(this.response);

      await this._logResponse();
      this._callback(null, formattedResponse, this._createMetadata());
    } catch (err) {
      await this._logError(err);

      const grpcError = {
        code: err.grpcCode || GrpcErrorMap[err.name] || status.INTERNAL,
        message: err.message,
        details: { errorType: err.name },
      };

      this._callback(grpcError, null, this._createMetadata());
    }
  }
}

module.exports = GrpcController;
