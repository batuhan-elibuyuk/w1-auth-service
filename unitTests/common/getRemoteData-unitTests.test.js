const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const stream = require("stream");

describe("REST Utils", () => {
  let axiosStub;
  let fsStub;
  let restUtils;

  beforeEach(() => {
    axiosStub = Object.assign(sinon.stub(), {
      get: sinon.stub(),
      request: sinon.stub(),
    });

    fsStub = {
      createWriteStream: sinon.stub(),
    };

    restUtils = proxyquire("../../src/common/getRemoteData", {
      axios: axiosStub,
      fs: fsStub,
    });
  });

  afterEach(() => sinon.restore());

  describe("sendRestRequest", () => {
    it("should send GET with bearer and query", async () => {
      axiosStub.resolves({ data: { success: true } });

      const result = await restUtils.sendRestRequest(
        "http://test.com/api",
        "token123",
        null,
        null,
        null,
        { foo: "bar" },
        "GET",
      );

      expect(result).to.deep.equal({ success: true });
      const req = axiosStub.firstCall.args[0];
      expect(req.headers.Authorization).to.equal("Bearer token123");
      expect(req.params).to.deep.equal({ foo: "bar" });
    });

    it("should include cookies in headers", async () => {
      axiosStub.resolves({ data: {} });

      await restUtils.sendRestRequest(
        "http://test.com/api",
        null,
        null,
        { sid: "xyz" },
        null,
        null,
        "GET",
      );

      const req = axiosStub.firstCall.args[0];
      expect(req.headers.Cookie).to.equal("sid=xyz;");
    });

    it("should return null on 404 error", async () => {
      axiosStub.rejects({ response: { status: 404 } });

      const result = await restUtils.sendRestRequest(
        "http://test.com/404",
        null,
        null,
        null,
        null,
        null,
        "GET",
      );
      expect(result).to.be.null;
    });

    it("should throw other errors", async () => {
      const err = new Error("timeout");
      axiosStub.rejects(err);

      try {
        await restUtils.sendRestRequest(
          "http://fail.com",
          null,
          null,
          null,
          null,
          null,
          "GET",
        );
        expect.fail("Expected to throw");
      } catch (error) {
        expect(error.message).to.equal("timeout");
      }
    });

    it("should serialize response if serializer provided", async () => {
      axiosStub.resolves({ data: { id: 1 } });
      const result = await restUtils.sendRestRequest(
        "http://x.com",
        null,
        null,
        null,
        null,
        null,
        "GET",
        "MySerializer",
      );
      expect(result).to.deep.equal({
        data: { id: 1 },
        serializer: "MySerializer",
      });
    });

    it("should serialize null if 404 and serializer provided", async () => {
      axiosStub.rejects({ response: { status: 404 } });
      const result = await restUtils.sendRestRequest(
        "http://404.com",
        null,
        null,
        null,
        null,
        null,
        "GET",
        "MySerializer",
      );
      expect(result).to.deep.equal({ data: null, serializer: "MySerializer" });
    });
  });

  describe("getRestData", () => {
    it("should call axios.get with Authorization", async () => {
      axiosStub.get.resolves({ data: { ok: true } });

      const result = await restUtils.getRestData(
        "http://test.com/data",
        "token123",
      );

      expect(result).to.deep.equal({ ok: true });
      expect(axiosStub.get.firstCall.args[1].headers.Authorization).to.equal(
        "Bearer token123",
      );
    });

    it("should return null for 404", async () => {
      axiosStub.get.rejects({ response: { status: 404 } });
      const result = await restUtils.getRestData("http://test.com/404");
      expect(result).to.be.null;
    });

    it("should return error object for other errors", async () => {
      const error = new Error("network down");
      axiosStub.get.rejects(error);

      const result = await restUtils.getRestData("http://test.com/error");
      expect(result).to.equal(error);
    });

    it("should serialize result if serializer provided", async () => {
      axiosStub.get.resolves({ data: { a: 1 } });
      const result = await restUtils.getRestData(
        "http://x",
        null,
        "MySerializer",
      );
      expect(result).to.deep.equal({
        data: { a: 1 },
        serializer: "MySerializer",
      });
    });

    it("should serialize null if 404 and serializer provided", async () => {
      axiosStub.get.rejects({ response: { status: 404 } });
      const result = await restUtils.getRestData("/x", null, "MySerializer");
      expect(result).to.deep.equal({ data: null, serializer: "MySerializer" });
    });
  });

  describe("downloadFile", () => {
    it("should write file stream to disk", async () => {
      const fakeStream = new stream.Readable({ read() {} });
      const fakeWriter = new stream.Writable({
        write(chunk, encoding, cb) {
          cb();
        },
      });

      sinon.stub(fakeWriter, "on").callsFake((event, cb) => {
        if (event === "finish") setImmediate(cb);
        return fakeWriter;
      });

      fsStub.createWriteStream.returns(fakeWriter);
      axiosStub.resolves({ status: 200, data: fakeStream });

      fakeStream.pipe = sinon.stub().returns(fakeWriter);

      const result = await restUtils.downloadFile("http://file.com", "out.txt");
      expect(result).to.be.true;
    });

    it("should reject on writer error", async () => {
      const fakeStream = new stream.Readable({ read() {} });
      const fakeWriter = new stream.Writable();

      fsStub.createWriteStream.returns(fakeWriter);
      axiosStub.resolves({ status: 200, data: fakeStream });

      fakeStream.pipe = sinon.stub().returns(fakeWriter);

      const promise = restUtils.downloadFile("http://file.com", "output.txt");
      setImmediate(() => fakeWriter.emit("error", new Error("disk error")));

      try {
        await promise;
        expect.fail("Expected error");
      } catch (err) {
        expect(err.message).to.include("disk error");
      }
    });
  });
});
