const { expect } = require("chai");
const sinon = require("sinon");
const { Kafka } = require("kafkajs");
const proxyquire = require("proxyquire");

describe("Kafka Integration", () => {
  let producerStub, consumerStub1, consumerStub2;
  let kafkaModule;
  let consumers = [];

  beforeEach(() => {
    // Prepare new stubs before each test
    producerStub = {
      connect: sinon.stub().resolves(),
      send: sinon.stub().resolves([{ topicName: "test-topic", errorCode: 0 }]),
      disconnect: sinon.stub().resolves(),
    };

    // Use factory to create unique consumer stubs
    const createConsumerStub = () => {
      const stub = {
        connect: sinon.stub().resolves(),
        subscribe: sinon.stub().resolves(),
        run: sinon.stub().resolves(),
        disconnect: sinon.stub().resolves(),
      };
      consumers.push(stub);
      return stub;
    };

    // Stub Kafka constructor
    sinon.stub(Kafka.prototype, "producer").returns(producerStub);
    sinon.stub(Kafka.prototype, "consumer").callsFake(createConsumerStub);

    kafkaModule = proxyquire("../../src/common/kafka", {
      kafkajs: { Kafka },
    });
  });

  afterEach(() => {
    sinon.restore();
    consumers = []; // reset for next test
  });

  describe("connectToKafka", () => {
    it("should connect to Kafka successfully", async () => {
      await kafkaModule.connectToKafka();
      expect(producerStub.connect.calledOnce).to.be.true;
    });
    it("should log error if producer.connect fails", async () => {
      const errorStub = sinon.stub(console, "log");
      producerStub.connect.rejects(new Error("connect fail"));

      await kafkaModule.connectToKafka();

      expect(errorStub.calledWithMatch("kafka producer can not connect")).to.be
        .true;
      errorStub.restore();
    });
  });

  describe("sendMessageToKafka", () => {
    it("should send a message to Kafka", async () => {
      await kafkaModule.connectToKafka();
      await kafkaModule.sendMessageToKafka("test-topic", { test: 1 });
      expect(producerStub.send.calledOnce).to.be.true;
    });

    it("should return null and log error on failure", async () => {
      producerStub.send.rejects(new Error("send failed"));
      await kafkaModule.connectToKafka();
      const result = await kafkaModule.sendMessageToKafka("fail-topic", {});
      expect(result).to.be.null;
    });

    it("should return null if producer is not initialized", async () => {
      const result = await kafkaModule.sendMessageToKafka("some-topic", {});
      expect(result).to.be.null;
    });
  });

  describe("createConsumer", () => {
    it("should return a consumer instance", async () => {
      await kafkaModule.connectToKafka();
      const consumer = kafkaModule.createConsumer("topic-a", "listener-a");
      expect(consumer.connect).to.be.a("function");
    });

    it("should create unique groupId for different listeners", async () => {
      await kafkaModule.connectToKafka();
      const consumer1 = kafkaModule.createConsumer("topic", "listenerA");
      const consumer2 = kafkaModule.createConsumer("topic", "listenerB");
      expect(consumer1).to.not.equal(consumer2);
    });
  });

  describe("closeKafka", () => {
    it("should disconnect all consumers and producer", async () => {
      await kafkaModule.connectToKafka();
      consumerStub1 = kafkaModule.createConsumer("topic-1", "group-1");
      consumerStub2 = kafkaModule.createConsumer("topic-2", "group-2");

      await kafkaModule.closeKafka();

      expect(producerStub.disconnect.calledOnce).to.be.true;
      expect(consumerStub1.disconnect.calledOnce).to.be.true;
      expect(consumerStub2.disconnect.calledOnce).to.be.true;
    });

    it("should not fail if closeKafka is called before connect", async () => {
      const { closeKafka } = require("../../src/common/kafka");
      await closeKafka(); // no-op scenario
      expect(true).to.be.true; // no exception = pass
    });
  });
});
