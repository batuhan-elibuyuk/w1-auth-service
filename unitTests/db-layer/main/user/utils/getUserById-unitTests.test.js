const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { Op } = require("sequelize");

describe("getUserById module", () => {
  let sandbox;
  let getUserById;
  let UserStub;

  const fakeId = "uuid-123";
  const fakeData = { id: fakeId, name: "Test User" };

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    UserStub = {
      findByPk: sandbox.stub().resolves({
        getData: () => fakeData,
      }),
      findAll: sandbox
        .stub()
        .resolves([
          { getData: () => ({ id: "1", name: "Item 1" }) },
          { getData: () => ({ id: "2", name: "Item 2" }) },
        ]),
    };

    getUserById = proxyquire(
      "../../../../../src/db-layer/main/User/utils/getUserById",
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

  describe("getUserById", () => {
    it("should return getData() for single ID", async () => {
      const result = await getUserById(fakeId);

      expect(result).to.deep.equal(fakeData);
      sinon.assert.calledOnce(UserStub.findByPk);
      sinon.assert.calledWith(UserStub.findByPk, fakeId);
    });

    it("should return mapped getData() results for array of IDs", async () => {
      const result = await getUserById(["1", "2"]);

      expect(result).to.deep.equal([
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ]);
      sinon.assert.calledOnce(UserStub.findAll);
      sinon.assert.calledWithMatch(UserStub.findAll, {
        where: { id: { [Op.in]: ["1", "2"] } },
      });
    });

    it("should return null if record not found (single ID)", async () => {
      UserStub.findByPk.resolves(null);
      const result = await getUserById(fakeId);

      expect(result).to.be.null;
    });

    it("should return null if empty array returned from findAll", async () => {
      UserStub.findAll.resolves([]);
      const result = await getUserById(["a", "b"]);

      expect(result).to.deep.equal([]);
    });

    it("should wrap unexpected errors with HttpServerError (single ID)", async () => {
      UserStub.findByPk.rejects(new Error("DB failure"));

      try {
        await getUserById("test");
        throw new Error("Expected HttpServerError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.message).to.equal("errMsg_dbErrorWhenRequestingUserById");
        expect(err.details.message).to.equal("DB failure");
      }
    });

    it("should wrap unexpected errors with HttpServerError (array of IDs)", async () => {
      UserStub.findAll.rejects(new Error("array failure"));

      try {
        await getUserById(["fail"]);
        throw new Error("Expected HttpServerError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.message).to.equal("errMsg_dbErrorWhenRequestingUserById");
        expect(err.details.message).to.equal("array failure");
      }
    });

    it("should return undefined if getData() returns undefined", async () => {
      UserStub.findByPk.resolves({ getData: () => undefined });
      const result = await getUserById(fakeId);

      expect(result).to.be.undefined;
    });

    it("should return array of undefineds if getData() returns undefined per item", async () => {
      UserStub.findAll.resolves([
        { getData: () => undefined },
        { getData: () => undefined },
      ]);

      const result = await getUserById(["1", "2"]);

      expect(result).to.deep.equal([undefined, undefined]);
    });
  });
});
