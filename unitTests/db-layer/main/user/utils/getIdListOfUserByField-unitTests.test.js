const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { Op } = require("sequelize");

describe("getIdListOfUserByField module", () => {
  let sandbox;
  let getIdListOfUserByField;
  let UserStub, hexaLogger;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    UserStub = {
      findAll: sandbox.stub().resolves([{ id: "1" }, { id: "2" }]),
      email: "example-type",
    };

    hexaLogger = {
      insertError: sandbox.stub(),
    };

    getIdListOfUserByField = proxyquire(
      "../../../../../src/db-layer/main/User/utils/getIdListOfUserByField",
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
          NotFoundError: class NotFoundError extends Error {
            constructor(msg) {
              super(msg);
              this.name = "NotFoundError";
            }
          },
          hexaLogger,
        },
        sequelize: { Op },
      },
    );
  });

  afterEach(() => sandbox.restore());

  describe("getIdListOfUserByField", () => {
    it("should return list of IDs when valid field and value is given", async () => {
      UserStub["email"] = "string";
      const result = await getIdListOfUserByField("email", "test-value", false);
      expect(result).to.deep.equal(["1", "2"]);
      sinon.assert.calledOnce(UserStub.findAll);
    });

    it("should return list of IDs using Op.contains if isArray is true", async () => {
      UserStub["email"] = "string";
      const result = await getIdListOfUserByField("email", "val", true);
      const call = UserStub.findAll.getCall(0);
      expect(call.args[0].where["email"][Op.contains]).to.include("val");
    });

    it("should throw BadRequestError if field name is invalid", async () => {
      try {
        await getIdListOfUserByField("nonexistentField", "x", false);
        throw new Error("Expected BadRequestError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.details.name).to.equal("BadRequestError");
        expect(err.details.message).to.include("Invalid field name");
      }
    });

    it("should throw BadRequestError if field value has wrong type", async () => {
      UserStub["email"] = 123; // expects number

      try {
        await getIdListOfUserByField("email", "wrong-type", false);
        throw new Error("Expected BadRequestError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.details.name).to.equal("BadRequestError");
        expect(err.details.message).to.include("Invalid field value type");
      }
    });

    it("should throw NotFoundError if no records are found", async () => {
      UserStub.findAll.resolves([]);
      UserStub["email"] = "string";

      try {
        await getIdListOfUserByField("email", "nomatch", false);
        throw new Error("Expected NotFoundError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.details.name).to.equal("NotFoundError");
        expect(err.details.message).to.include(
          "User with the specified criteria not found",
        );
      }
    });

    it("should wrap findAll error in HttpServerError", async () => {
      UserStub.findAll.rejects(new Error("query failed"));
      UserStub["email"] = "string";

      try {
        await getIdListOfUserByField("email", "test", false);
        throw new Error("Expected HttpServerError");
      } catch (err) {
        expect(err.name).to.equal("HttpServerError");
        expect(err.details.message).to.equal("query failed");
      }
    });

    it("should log error to hexaLogger if any error occurs", async () => {
      const error = new Error("boom");
      UserStub.findAll.rejects(error);
      UserStub["email"] = "string";

      try {
        await getIdListOfUserByField("email", "test", false);
      } catch (err) {
        sinon.assert.calledOnce(hexaLogger.insertError);
        sinon.assert.calledWithMatch(hexaLogger.insertError, "DatabaseError");
      }
    });
  });
});
