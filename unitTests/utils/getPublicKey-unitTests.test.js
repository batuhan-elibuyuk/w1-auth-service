const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("getPublicKey", () => {
  let getRestDataStub;
  let writeFileSyncStub;
  let getPublicKey;
  let originalEnv;

  beforeEach(() => {
    // Backup original process.env
    originalEnv = { ...process.env };

    // Default mock values
    process.env.SERVICE_URL = "https://myapi-service.com";
    process.env.SERVICE_SHORT_NAME = "service";
    process.env.KEYS_FOLDER = "test_keys";

    getRestDataStub = sinon.stub();
    writeFileSyncStub = sinon.stub();

    getPublicKey = proxyquire("../../src/utils/getPublicKey.js", {
      fs: {
        writeFileSync: writeFileSyncStub,
      },
      path: require("path"),
      common: {
        getRestData: getRestDataStub,
      },
    });
  });

  afterEach(() => {
    sinon.restore();
    process.env = originalEnv;
  });

  it("should fetch and save public key if data is valid", async () => {
    getRestDataStub.resolves({
      keyId: "123",
      keyData: "-----BEGIN PUBLIC KEY-----\nabc123\n-----END PUBLIC KEY-----",
    });

    const result = await getPublicKey();

    expect(result).to.be.an("object");
    expect(result.keyId).to.equal("123");
    expect(writeFileSyncStub.calledOnce).to.be.true;
    expect(writeFileSyncStub.firstCall.args[1]).to.include("BEGIN PUBLIC KEY");
  });

  it("should return null if public key response is invalid", async () => {
    getRestDataStub.resolves({
      keyId: "123",
      keyData: "INVALID_KEY",
    });

    const result = await getPublicKey();

    expect(result).to.be.null;
    expect(writeFileSyncStub.called).to.be.false;
  });

  it("should return null and log if public key is not found", async () => {
    getRestDataStub.resolves(null);

    const result = await getPublicKey();

    expect(result).to.be.null;
    expect(writeFileSyncStub.called).to.be.false;
  });

  it("should throw and return null if getRestData throws", async () => {
    getRestDataStub.rejects(new Error("Request failed"));

    const result = await getPublicKey();

    expect(result).to.be.null;
    expect(writeFileSyncStub.called).to.be.false;
  });

  it("should throw and return null if getRestData returns Error instance", async () => {
    getRestDataStub.resolves(new Error("API Error"));

    const result = await getPublicKey();

    expect(result).to.be.null;
    expect(writeFileSyncStub.called).to.be.false;
  });
});
