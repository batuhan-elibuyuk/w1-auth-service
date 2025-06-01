const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("HexaLogger & ElasticSearchLogger", () => {
  let elasticStub, HexaLoggerModule, hexaLogger;
  const fakeIndexResult = { _id: "log123", result: "created" };

  beforeEach(() => {
    elasticStub = {
      indices: {
        exists: sinon.stub().resolves(false),
        create: sinon.stub().resolves(),
        putMapping: sinon.stub().resolves(),
      },
      index: sinon.stub().resolves(fakeIndexResult),
      deleteByQuery: sinon.stub().resolves({ deleted: 5 }),
    };

    HexaLoggerModule = proxyquire("../../src/common/hexa-logger", {
      "./elastic": { elasticClient: elasticStub },
      uuid: { v4: () => "00000000-0000-0000-0000-000000000000" },
    });

    hexaLogger = HexaLoggerModule.hexaLogger;
  });

  describe("HexaLogger behavior", () => {
    it("should insert error and write if waitForWrite is true", async () => {
      const spy = sinon.spy(hexaLogger, "writeLog");
      await hexaLogger.insertError(
        "test",
        {},
        "loc",
        new Error("err"),
        "req1",
        true,
      );
      expect(spy.called).to.be.true;
    });

    it("should not transform non-Error data in insertError", async () => {
      const data = { msg: "plain object" };
      const spy = sinon.spy(hexaLogger, "writeLog");
      await hexaLogger.insertError("err", {}, "loc", data, "req", true);
      const passedLog = hexaLogger.logs.find((l) => l.subject === "err");
      expect(passedLog.data).to.deep.equal(data);
      expect(spy.called).to.be.true;
    });

    /*it("should log to console in writeLog", async () => {
      // Get a new logger instance
      const LoggerClass = HexaLoggerModule.hexaLogger.constructor;
      const logger = new LoggerClass();
    
      // force writeDetail true
      logger.writeDetail = true;
    
      // Stub console.log to spy
      const logSpy = sinon.stub(console, "log");
    
      // Build a complete mock HexaLog object
      const log = {
        date: new Date(),
        logType: 0,
        logLevel: 1,
        logSource: "my-service",
        subject: "something-happened",
        location: "file.js",
        params: {},
        data: { a: 1 },
        requestId: "req-1",
        getLogHeader: () => "INFO:01",
        toObject: () => ({
          date: new Date(),
          logType: 0,
          logTypeName: "INFO",
          logLevel: 1,
          logSource: "my-service",
          subject: "something-happened",
          location: "file.js",
          params: {},
          data: { a: 1 },
          requestId: "req-1",
        }),
      };
    
      // Call method directly
      const result = await logger.writeLog(log);
    
      // Assertions
      expect(result).to.equal(true);
      expect(logSpy.called).to.be.true;
    
      logSpy.restore();
    }); */

    it("should insert warning and defer write if waitForWrite is false", async () => {
      const spy = sinon.spy(hexaLogger, "writeLog");
      await hexaLogger.insertWarning(
        "warn",
        {},
        "loc",
        { msg: "warn" },
        "req2",
        false,
      );
      await hexaLogger.logToTarget();
      expect(spy.called).to.be.true;
    });

    it("should insert info log and defer write if waitForWrite is false", async () => {
      const spy = sinon.spy(hexaLogger, "writeLog");
      await hexaLogger.insertInfo(
        "info",
        {},
        "loc",
        { msg: true },
        "req3",
        false,
      );
      await hexaLogger.logToTarget();
      expect(spy.called).to.be.true;
    });

    it("should not mark log as logged if writeLog returns false", async () => {
      await hexaLogger.insertInfo("msg", {}, "loc", {}, "r1", false);
      const log = hexaLogger.logs[0];
      sinon.stub(hexaLogger, "writeLog").resolves(false);
      log.logged = false;

      await hexaLogger.logToTarget();
      expect(log.logged).to.be.false;
    });

    it("should insert generic log and write immediately if waitForWrite is true", async () => {
      const spy = sinon.spy(hexaLogger, "writeLog");
      await hexaLogger.insertLog(0, 5, "subject", {}, "loc", {}, "req4", true);
      expect(spy.called).to.be.true;
    });

    it("should clear only unlogged logs", async () => {
      await hexaLogger.insertInfo("msg", {}, "loc", {}, "r1", false);
      hexaLogger.logs[0].logged = true;
      await hexaLogger.clearLogs();
      expect(hexaLogger.logs).to.be.empty;
    });
  });

  describe("ElasticSearchLogger", () => {
    it("should write to Elasticsearch index", async () => {
      const logger = new HexaLoggerModule.hexaLogger.constructor();
      const result = await logger.writeLog({
        id: "abc",
        date: new Date(),
        logType: 0,
        logLevel: 1,
        logSource: "src",
        subject: "sub",
        location: "loc",
        params: {},
        data: {},
        requestId: "req1",
        getLogHeader: () => "INFO:01",
        toObject: () => ({ date: new Date(), subject: "sub" }),
      });
      expect(result).to.be.true;
    });

    it("should return false if elastic index fails", async () => {
      elasticStub.index.rejects(new Error("index fail"));
      const logger = new HexaLoggerModule.hexaLogger.constructor();
      const result = await logger.writeLog({
        id: "abc",
        date: new Date(),
        logType: 0,
        logLevel: 1,
        logSource: "src",
        subject: "sub",
        location: "loc",
        params: {},
        data: {},
        requestId: "req1",
        getLogHeader: () => "INFO:01",
        toObject: () => ({ date: new Date(), subject: "sub" }),
      });
      expect(result).to.be.false;
    });

    it("should update mappings when index does not exist", async () => {
      const logger = new HexaLoggerModule.hexaLogger.constructor();
      await logger.updateLoggerMappings();
      expect(elasticStub.indices.create.called).to.be.true;
      expect(elasticStub.indices.putMapping.called).to.be.true;
    });

    it("should clear all logs in index", async () => {
      const logger = new HexaLoggerModule.hexaLogger.constructor();
      const count = await logger.clearLogStore();
      expect(count).to.equal(5);
    });

    it("should delete aged logs", async () => {
      const logger = new HexaLoggerModule.hexaLogger.constructor();
      const count = await logger.clearAgedLogs();
      expect(count).to.equal(5);
    });

    it("should return 0 if clearLogStore fails", async () => {
      elasticStub.deleteByQuery.rejects(new Error("fail"));
      const logger = new HexaLoggerModule.hexaLogger.constructor();
      const count = await logger.clearLogStore();
      expect(count).to.equal(0);
    });

    it("should return 0 if clearAgedLogs fails", async () => {
      elasticStub.deleteByQuery.rejects(new Error("fail"));
      const logger = new HexaLoggerModule.hexaLogger.constructor();
      const count = await logger.clearAgedLogs();
      expect(count).to.equal(0);
    });
  });

  describe("createHexaLogger() singleton", () => {
    it("should return same instance always", () => {
      const createFn = proxyquire("../../src/common/hexa-logger", {
        "./elastic": { elasticClient: elasticStub },
      });
      const instance1 = createFn.hexaLogger;
      const instance2 = createFn.hexaLogger;
      expect(instance1).to.equal(instance2);
    });
  });
});
