const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("KafkaController", () => {
  let KafkaController;
  let KafkaPublisherStub, publishStub;
  let hexaLogger;
  let message, kafkaSettings;

  beforeEach(() => {
    message = { requestId: "kafka-req-123", someKey: "someValue" };
    kafkaSettings = {
      requestTopicName: "req-topic",
      responseTopicName: "res-topic",
      crudType: "create",
    };

    publishStub = sinon.stub().resolves(true);

    KafkaPublisherStub = sinon.stub().callsFake(function () {
      this.publish = publishStub;
    });

    hexaLogger = {
      insertInfo: sinon.stub(),
      insertError: sinon.stub(),
    };

    KafkaController = proxyquire(
      "../../../src/controllers-layer/kafka-layer/KafkaController.js",
      {
        common: {
          hexaLogger,
          HexaLogTypes: {},
          KafkaPublisher: KafkaPublisherStub,
        },
      },
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should initialize controller with correct values", () => {
    const controller = new KafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );
    expect(controller.name).to.equal("testFunc");
    expect(controller.routeName).to.equal("route");
    expect(controller.crudType).to.equal("create");
    expect(controller.requestTopic).to.equal("req-topic");
    expect(controller.responseTopic).to.equal("res-topic");
    expect(controller.dataName).to.equal("kafkaData");
    expect(controller.requestId).to.equal("kafka-req-123");
  });

  it("should call _logRequest properly", async () => {
    const controller = new KafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );
    await controller._logRequest();

    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "KafkaRequestReceived",
        sinon.match.object,
        "route.js->testFunc",
        sinon.match.object,
        "kafka-req-123",
      ),
    ).to.be.true;
  });

  it("should call _logResponse properly", async () => {
    const controller = new KafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );
    controller.response = { data: "ok" };
    await controller._logResponse();

    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "KafkaRequestResponded",
        sinon.match.object,
        "route.js->testFunc",
        sinon.match.object,
        "kafka-req-123",
      ),
    ).to.be.true;
  });

  it("should publish response successfully", async () => {
    const controller = new KafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );
    controller.startTime = Date.now() - 50;
    controller.response = { test: "ok" };

    const result = await controller.publishResponse();

    expect(publishStub.calledOnce).to.be.true;
    expect(result).to.be.true;
    expect(hexaLogger.insertInfo.calledWithMatch("KafkaRequestResponded")).to.be
      .true;
  });

  it("should handle publish error in publishResponse()", async () => {
    publishStub.rejects(new Error("publish failed"));

    const controller = new KafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );
    controller.response = { foo: "bar" };
    controller.startTime = Date.now();

    try {
      await controller.publishResponse();
    } catch (err) {
      expect(err.message).to.equal("publish failed");
      expect(
        hexaLogger.insertError.calledWithMatch(
          "KafkaPublishError",
          sinon.match.any,
          "route.js->testFunc",
          sinon.match.any,
          "kafka-req-123",
        ),
      ).to.be.true;
    }
  });

  it("should handle error in handleError()", async () => {
    const controller = new KafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );
    controller.startTime = Date.now() - 100;

    const error = new Error("Something failed");

    await controller.handleError(error);

    expect(publishStub.calledOnce).to.be.true;
    expect(
      hexaLogger.insertError.calledWithMatch(
        "KafkaProcessingError",
        sinon.match.any,
        "route.js->testFunc",
        sinon.match.any,
        "kafka-req-123",
      ),
    ).to.be.true;
  });

  it("should call createApiManager, execute and publish response in processMessage", async () => {
    class TestKafkaController extends KafkaController {
      async createApiManager() {
        return {
          execute: sinon.stub().resolves({ hello: "kafka" }),
        };
      }
    }

    const controller = new TestKafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );
    const result = await controller.processMessage();

    expect(result).to.deep.equal({ hello: "kafka" });
    expect(publishStub.calledOnce).to.be.true;
    expect(hexaLogger.insertInfo.calledWithMatch("KafkaRequestReceived")).to.be
      .true;
  });

  it("should call handleError if createApiManager throws", async () => {
    class TestKafkaController extends KafkaController {
      async createApiManager() {
        throw new Error("apiManager fail");
      }
    }

    const controller = new TestKafkaController(
      "testFunc",
      "route",
      message,
      kafkaSettings,
    );

    try {
      await controller.processMessage();
    } catch (err) {
      expect(err.message).to.equal("apiManager fail");
      expect(publishStub.calledOnce).to.be.true; // from handleError
      expect(hexaLogger.insertError.calledWithMatch("KafkaProcessingError")).to
        .be.true;
    }
  });
});
