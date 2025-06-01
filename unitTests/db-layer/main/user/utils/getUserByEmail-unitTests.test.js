const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("getUserByEmail module", () => {
  let sandbox;
  let getUserByEmail;
  let UserStub;

  const mockData = { id: "123", name: "Test User" };

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    UserStub = {
      findOne: sandbox.stub().resolves({
        getData: () => mockData,
      }),
    };

    getUserByEmail = proxyquire(
      "../../../../../src/db-layer/main/User/utils/getUserByEmail",
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
        sequelize: { Op: require("sequelize").Op },
      },
    );
  });

  afterEach(() => sandbox.restore());

  describe("getUserByEmail", () => {
    it("should return getData() if user is found", async () => {
      const result = await getUserByEmail("some-key");
      expect(result).to.deep.equal(mockData);
      sinon.assert.calledOnce(UserStub.findOne);
      sinon.assert.calledWithMatch(UserStub.findOne, {
        where: { email: "some-key" },
      });
    });

    it("should return null if user is not found", async () => {
      UserStub.findOne.resolves(null);
      const result = await getUserByEmail("missing-key");
      expect(result).to.equal(null);
    });

    it("should return undefined if getData returns undefined", async () => {
      UserStub.findOne.resolves({ getData: () => undefined });
      const result = await getUserByEmail("key");
      expect(result).to.be.undefined;
    });

    it("should throw HttpServerError if findOne throws", async () => {
      UserStub.findOne.rejects(new Error("db failure"));

      try {
        await getUserByEmail("key");
        throw new Error("Expected to throw");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.message).to.equal("errMsg_dbErrorWhenRequestingUserByEmail");
        expect(err.details.message).to.equal("db failure");
      }
    });
  });
});
