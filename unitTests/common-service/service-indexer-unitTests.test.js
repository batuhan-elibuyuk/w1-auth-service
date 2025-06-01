require("module-alias/register");
const { expect } = require("chai");
const sinon = require("sinon");
const { ElasticIndexer, hexaLogger } = require("common");
const ServicePublisher = require("../../src/common-service/service-publisher");
const ServiceIndexer = require("../../src/common-service/service-indexer");

describe("ServiceIndexer", function () {
  let serviceIndexer, sessionStub;

  beforeEach(function () {
    sessionStub = { id: "session123", fullname: "Test User" };
    serviceIndexer = new ServiceIndexer("testIndex", sessionStub);
  });

  afterEach(function () {
    sinon.restore();
  });

  describe("inheritance", function () {
    it("should be an instance of ElasticIndexer", () => {
      expect(serviceIndexer).to.be.instanceOf(ElasticIndexer);
    });
  });

  describe("constructor", function () {
    it("should initialize with correct index name and session", function () {
      expect(serviceIndexer.indexName).to.equal("babilshop_testindex");
      expect(serviceIndexer.session).to.deep.equal(sessionStub);
    });
  });

  describe("logResult", function () {
    it("should call hexaLogger.insertLog with correct parameters", async function () {
      const logStub = sinon.stub(hexaLogger, "insertLog").resolves();
      await serviceIndexer.logResult(
        "INFO",
        "TestSubject",
        { key: "value" },
        "TestLocation",
        { data: 123 },
      );

      expect(
        logStub.calledOnceWithExactly(
          "INFO",
          1,
          "TestSubject",
          { key: "value" },
          "TestLocation",
          { data: 123 },
        ),
      ).to.be.true;
    });
  });

  describe("publishEvent", function () {
    it("should call ServicePublisher.publish with correct parameters", async function () {
      const publisherStub = sinon
        .stub(ServicePublisher.prototype, "publish")
        .resolves("published");

      const result = await serviceIndexer.publishEvent("TestEvent", {
        key: "value",
      });

      expect(publisherStub.calledOnce).to.be.true;
      expect(result).to.equal("published");
    });
  });
});
