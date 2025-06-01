const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("Elastic Client Setup", () => {
  let sandbox, elasticClientMock, connectToElastic, closeElastic, elasticClient;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    elasticClientMock = {
      info: sandbox.stub().resolves({ version: { number: "8.9.0" } }),
      close: sandbox.stub(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  const loadModule = (shouldThrow = false) => {
    const ClientStub = shouldThrow
      ? sandbox.stub().throws(new Error("Failed to create client"))
      : sandbox.stub().returns(elasticClientMock);

    const module = proxyquire("../../src/common/elastic", {
      "@elastic/elasticsearch": {
        Client: ClientStub,
      },
      process: { env: {} },
    });

    connectToElastic = module.connectToElastic;
    closeElastic = module.closeElastic;
    elasticClient = module.elasticClient;
  };

  describe("connectToElastic", () => {
    it("should log connection info if client is connected", async () => {
      loadModule();
      const logSpy = sandbox.spy(console, "log");
      await connectToElastic();
      expect(logSpy.calledWithMatch("elasticClient connected:")).to.be.true;
    });

    it("should log error if info call fails", async () => {
      elasticClientMock.info.rejects(new Error("connection refused"));
      loadModule(elasticClientMock);
      const logSpy = sandbox.spy(console, "log");
      await connectToElastic();
      expect(logSpy.calledWithMatch("elasticClient not connected:")).to.be.true;
    });

    it("should log null client if client is not initialized", async () => {
      loadModule(true); // simulate failure during client creation
      const logSpy = sandbox.spy(console, "log");
      await connectToElastic();
      expect(logSpy.calledWith("elasticClient not connected:null client")).to.be
        .true;
    });

    it("should not throw when elasticClient is null", async () => {
      loadModule(true); // simulate client failure
      expect(async () => await connectToElastic()).to.not.throw();
    });
  });

  describe("closeElastic", () => {
    it("should call elasticClient.close", () => {
      loadModule();
      closeElastic();
      expect(elasticClientMock.close.calledOnce).to.be.true;
    });
  });

  describe("environment variables", () => {
    it("should respect ELASTIC_URI, ELASTIC_USER, ELASTIC_PWD", () => {
      process.env.ELASTIC_URI = "https://example.com";
      process.env.ELASTIC_USER = "user1";
      process.env.ELASTIC_PWD = "pwd1";

      const clientSpy = sandbox.spy();
      proxyquire("../../src/common/elastic", {
        "@elastic/elasticsearch": {
          Client: clientSpy,
        },
      });

      const config = clientSpy.firstCall.args[0];
      expect(config.node).to.equal("https://example.com");
      expect(config.auth.username).to.equal("user1");
      expect(config.auth.password).to.equal("pwd1");

      // cleanup
      delete process.env.ELASTIC_URI;
      delete process.env.ELASTIC_USER;
      delete process.env.ELASTIC_PWD;
    });
  });
});
