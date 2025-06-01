const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("setCurrentKeyId", () => {
  let existsSyncStub;
  let readFileSyncStub;
  let pathJoinStub;
  let originalEnv;
  let originalGlobal;
  let setCurrentKeyId;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalGlobal = global.currentKeyId;

    existsSyncStub = sinon.stub();
    readFileSyncStub = sinon.stub();
    pathJoinStub = sinon.stub().returns("/fake/path/currentKeyId");

    setCurrentKeyId = proxyquire("../../src/utils/setCurrentKeyId.js", {
      fs: {
        existsSync: existsSyncStub,
        readFileSync: readFileSyncStub,
      },
      path: {
        join: pathJoinStub,
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    global.currentKeyId = originalGlobal;
    sinon.restore();
  });

  it("should set global.currentKeyId to 'dev' if NODE_ENV is not 'prod'", async () => {
    process.env.NODE_ENV = "development";

    await setCurrentKeyId();

    expect(global.currentKeyId).to.equal("dev");
  });

  it("should set global.currentKeyId from file if it exists and NODE_ENV is 'prod'", async () => {
    process.env.NODE_ENV = "prod";
    existsSyncStub.returns(true);
    readFileSyncStub.returns("key123");

    await setCurrentKeyId();

    expect(global.currentKeyId).to.equal("key123");
    expect(pathJoinStub.calledOnce).to.be.true;
    expect(readFileSyncStub.calledOnceWith("/fake/path/currentKeyId", "utf8"))
      .to.be.true;
  });

  it("should set global.currentKeyId to null and log if file does not exist", async () => {
    process.env.NODE_ENV = "prod";
    existsSyncStub.returns(false);

    await setCurrentKeyId();

    expect(global.currentKeyId).to.equal(null);
  });

  it("should handle exceptions gracefully", async () => {
    process.env.NODE_ENV = "prod";
    existsSyncStub.throws(new Error("fail"));

    await setCurrentKeyId();

    expect(global.currentKeyId).to.equal(null); // still gets set even if error
  });

  it("should set global.currentKeyId to empty string if file is empty", async () => {
    process.env.NODE_ENV = "prod";
    existsSyncStub.returns(true);
    readFileSyncStub.returns(""); // empty file

    await setCurrentKeyId();

    expect(global.currentKeyId).to.equal("");
  });
});
