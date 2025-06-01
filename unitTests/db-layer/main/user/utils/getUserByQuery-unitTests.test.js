const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("getUserByQuery module", () => {
  let sandbox;
  let getUserByQuery;
  let UserStub;

  const fakeId = "uuid-123";
  const fakeRecord = {
    id: fakeId,
    name: "Test User",
    getData: () => ({ id: fakeId, name: "Test User" }),
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    UserStub = {
      findOne: sandbox.stub().resolves(fakeRecord),
    };

    getUserByQuery = proxyquire(
      "../../../../../src/db-layer/main/User/utils/getUserByQuery",
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
          BadRequestError: class BadRequestError extends Error {
            constructor(msg) {
              super(msg);
              this.name = "BadRequestError";
            }
          },
        },
      },
    );
  });

  afterEach(() => sandbox.restore());

  describe("getUserByQuery", () => {
    it("should return the result of getData if found", async () => {
      const result = await getUserByQuery({ id: fakeId });

      expect(result).to.deep.equal({ id: fakeId, name: "Test User" });
      sinon.assert.calledOnce(UserStub.findOne);
      sinon.assert.calledWith(UserStub.findOne, { where: { id: fakeId } });
    });

    it("should return null if no record is found", async () => {
      UserStub.findOne.resolves(null);

      const result = await getUserByQuery({ id: fakeId });

      expect(result).to.be.null;
      sinon.assert.calledOnce(UserStub.findOne);
    });

    it("should throw BadRequestError if query is undefined", async () => {
      try {
        await getUserByQuery(undefined);
        throw new Error("Expected BadRequestError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.details.name).to.equal("BadRequestError");
        expect(err.details.message).to.include("Invalid query");
      }
    });

    it("should throw BadRequestError if query is not an object", async () => {
      try {
        await getUserByQuery("invalid-query");
        throw new Error("Expected BadRequestError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.details.name).to.equal("BadRequestError");
        expect(err.details.message).to.include("Invalid query");
      }
    });

    it("should wrap findOne errors in HttpServerError", async () => {
      UserStub.findOne.rejects(new Error("findOne failed"));

      try {
        await getUserByQuery({ test: true });
        throw new Error("Expected HttpServerError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.message).to.equal("errMsg_dbErrorWhenRequestingUserByQuery");
        expect(err.details.message).to.equal("findOne failed");
      }
    });

    it("should return undefined if getData returns undefined", async () => {
      UserStub.findOne.resolves({ getData: () => undefined });

      const result = await getUserByQuery({ id: fakeId });

      expect(result).to.be.undefined;
    });
  });
});
