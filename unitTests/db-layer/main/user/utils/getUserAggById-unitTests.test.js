const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { Op } = require("sequelize");

describe("getUserAggById module", () => {
  let sandbox;
  let getUserAggById;
  let UserStub;

  const fakeId = "uuid-123";
  const fakeData = { id: fakeId, name: "Test User" };

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    UserStub = {
      findByPk: sandbox.stub().resolves({ getData: () => fakeData }),
      findAll: sandbox
        .stub()
        .resolves([
          { getData: () => ({ id: "1", name: "Item 1" }) },
          { getData: () => ({ id: "2", name: "Item 2" }) },
        ]),
      getCqrsJoins: sandbox.stub().resolves(),
    };

    getUserAggById = proxyquire(
      "../../../../../src/db-layer/main/User/utils/getUserAggById",
      {
        models: { User: UserStub },
        common: {
          HttpServerError: class HttpServerError extends Error {
            constructor(msg, details) {
              super(msg);
              this.name = "HttpServerError";
              this.details = details;
            }
          },
        },
        sequelize: { Op },
      },
    );
  });

  afterEach(() => sandbox.restore());

  describe("getUserAggById", () => {
    it("should return getData() with includes for single ID", async () => {
      const result = await getUserAggById(fakeId);
      expect(result).to.deep.equal(fakeData);
      sinon.assert.calledOnce(UserStub.findByPk);
      sinon.assert.calledOnce(UserStub.getCqrsJoins);
    });

    it("should return mapped getData() for array of IDs", async () => {
      const result = await getUserAggById(["1", "2"]);
      expect(result).to.deep.equal([
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ]);
      sinon.assert.calledOnce(UserStub.findAll);
      sinon.assert.calledOnce(UserStub.getCqrsJoins);
    });

    it("should return null if not found for single ID", async () => {
      UserStub.findByPk.resolves(null);
      const result = await getUserAggById(fakeId);
      expect(result).to.equal(null);
    });

    it("should return empty array if input is array but no results", async () => {
      UserStub.findAll.resolves([]);
      const result = await getUserAggById(["nope"]);
      expect(result).to.deep.equal([]);
    });

    it("should return undefined if getData returns undefined in array items", async () => {
      UserStub.findAll.resolves([
        { getData: () => undefined },
        { getData: () => undefined },
      ]);
      const result = await getUserAggById(["1", "2"]);
      expect(result).to.deep.equal([undefined, undefined]);
    });

    it("should return undefined if getData returns undefined in single ID", async () => {
      UserStub.findByPk.resolves({ getData: () => undefined });
      const result = await getUserAggById(fakeId);
      expect(result).to.be.undefined;
    });

    it("should throw HttpServerError on unexpected error (findByPk)", async () => {
      UserStub.findByPk.rejects(new Error("fail"));
      try {
        await getUserAggById(fakeId);
        throw new Error("Expected HttpServerError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.message).to.equal("errMsg_dbErrorWhenRequestingUserAggById");
        expect(err.details.message).to.equal("fail");
      }
    });

    it("should throw HttpServerError on unexpected error (findAll)", async () => {
      UserStub.findAll.rejects(new Error("all fail"));
      try {
        await getUserAggById(["1"]);
        throw new Error("Expected HttpServerError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.message).to.equal("errMsg_dbErrorWhenRequestingUserAggById");
        expect(err.details.message).to.equal("all fail");
      }
    });

    it("should throw HttpServerError if getCqrsJoins fails", async () => {
      UserStub.getCqrsJoins.rejects(new Error("joins fail"));
      try {
        await getUserAggById(fakeId);
        throw new Error("Expected HttpServerError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.message).to.equal("errMsg_dbErrorWhenRequestingUserAggById");
        expect(err.details.message).to.equal("joins fail");
      }
    });
  });
});
