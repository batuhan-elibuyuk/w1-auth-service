const { expect } = require("chai");
const sinon = require("sinon");
const { KafkaPublisher } = require("common");
const ServicePublisher = require("../../src/common-service/service-publisher");

describe("ServicePublisher", function () {
  let servicePublisher, sessionStub;

  beforeEach(function () {
    sessionStub = {
      id: "session123",
      sessionId: "session123",
      fullname: "Test User",
      email: "testuser@example.com",
      avatar: "avatar.jpg",
      roleId: "role123",
      clientId: "client123",
      userId: "user123",
    };

    servicePublisher = new ServicePublisher(
      "testTopic",
      { key: "value" },
      sessionStub,
    );
  });

  afterEach(function () {
    sinon.restore();
  });

  describe("inheritance", function () {
    it("should be an instance of KafkaPublisher", function () {
      expect(servicePublisher).to.be.instanceOf(KafkaPublisher);
    });
  });

  describe("constructor", function () {
    it("should correctly initialize with the provided session and data", function () {
      expect(servicePublisher.eventName).to.equal("testTopic");
      expect(servicePublisher.data).to.be.an("object");
      expect(servicePublisher.data).to.have.property("key", "value");
      expect(servicePublisher.data)
        .to.have.property("session")
        .that.deep.equals(sessionStub);
    });
  });
});
