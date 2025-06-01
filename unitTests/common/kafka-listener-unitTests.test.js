const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("KafkaListener", () => {
  let KafkaListener;
  let createConsumerStub;
  let hexaLoggerStub;
  let mockConsumer;

  beforeEach(() => {
    mockConsumer = {
      connect: sinon.stub().resolves(),
      subscribe: sinon.stub().resolves(),
      run: sinon.stub().resolves(),
    };

    createConsumerStub = sinon.stub().returns(mockConsumer);

    hexaLoggerStub = {
      insertInfo: sinon.stub().resolves(),
      insertError: sinon.stub().resolves(),
    };

    KafkaListener = proxyquire("../../src/common/kafka-listener", {
      "./kafka": { createConsumer: createConsumerStub },
      "../common/hexa-logger": {
        hexaLogger: hexaLoggerStub,
        HexaLogTypes: { logTypeInfo: 0, logTypeError: 2 },
      },
      "./hexa-listener": class {
        constructor(eventName, eventHandler, listenerType, callBackData) {
          this.eventName = eventName;
          this.eventHandler = eventHandler;
          this.listenerType = listenerType;
          this.callBackData = callBackData;
        }
      },
    });
  });

  describe("listen", () => {
    it("should set up Kafka consumer and start listening", async () => {
      const listener = new KafkaListener("test-topic", () => {});
      const result = await listener.listen();
      expect(createConsumerStub.calledWith("test-topic")).to.be.true;
      expect(mockConsumer.connect.calledOnce).to.be.true;
      expect(mockConsumer.subscribe.calledOnce).to.be.true;
      expect(mockConsumer.run.calledOnce).to.be.true;
      expect(result).to.be.true;
    });
  });

  describe("internalHandler", () => {
    let listener;
    let fakeMessage;
    let mockHandler;

    beforeEach(() => {
      fakeMessage = {
        value: Buffer.from(JSON.stringify({ session: { sessionId: "123" } })),
      };
    });

    it("should handle controller returning true", async () => {
      mockHandler = sinon.stub().resolves(true);
      listener = new KafkaListener("event", mockHandler);
      await listener.internalHandler("event", fakeMessage);
      expect(hexaLoggerStub.insertInfo.calledWithMatch("EventIsProcessed")).to
        .be.true;
    });

    it("should handle controller returning false (error)", async () => {
      mockHandler = sinon.stub().resolves(false);
      listener = new KafkaListener("event", mockHandler);
      await listener.internalHandler("event", fakeMessage);
      expect(hexaLoggerStub.insertError.calledWithMatch("EventCanNotProcessed"))
        .to.be.true;
    });

    it("should handle controller returning object with error", async () => {
      mockHandler = sinon
        .stub()
        .resolves({ eventProcess: false, response: new Error("fail") });
      listener = new KafkaListener("event", mockHandler);
      await listener.internalHandler("event", fakeMessage);
      expect(hexaLoggerStub.insertError.calledWithMatch("EventCanNotProcessed"))
        .to.be.true;
    });

    it("should catch and log errors thrown by controller", async () => {
      mockHandler = sinon.stub().throws(new Error("bad controller"));
      listener = new KafkaListener("event", mockHandler);
      await listener.internalHandler("event", fakeMessage);
      expect(hexaLoggerStub.insertError.calledWithMatch("ListenerError")).to.be
        .true;
    });
  });
});
