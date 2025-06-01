const { expect } = require("chai");
const sinon = require("sinon");
const {
  ForbiddenError,
  BadRequestError,
  ErrorCodes,
  NotAuthenticatedError,
} = require("common");
const {
  MobileVerification,
} = require("../../src/verification-services/mobile-verification");

describe("MobileVerification Service", function () {
  let req, res, next, mobileVerificationInstance;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    req = {
      body: {
        mobile: "1234567890",
        userId: "user123",
        secretCode: "ABC123",
      },
      session: {},
    };
    res = {
      send: sinon.spy(),
      status: sinon.stub().returns({ json: sinon.spy() }),
    };
    next = sinon.spy();
    mobileVerificationInstance = new MobileVerification(req);
  });

  describe("startVerification", () => {
    it("should throw BadRequestError if the mobile is already verified", async () => {
      sinon
        .stub(mobileVerificationInstance, "findUserByEmail")
        .resolves({ mobileVerified: true });

      try {
        await mobileVerificationInstance.startVerification();
        expect.fail("Expected BadRequestError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("errMsg_UserMobileAlreadyVerified");
      }
    });

    it("should successfully create a new mobile verification request", async () => {
      sinon.stub(mobileVerificationInstance, "findUserByEmail").resolves({
        id: "user123",
        mobileVerified: false,
        mobile: "1234567890",
      });

      sinon
        .stub(mobileVerificationInstance, "getMobileVerificationEntityCache")
        .resolves(null);
      sinon
        .stub(mobileVerificationInstance, "setMobileVerificationEntityCache")
        .resolves();
      sinon
        .stub(mobileVerificationInstance, "publishVerificationStartEvent")
        .resolves();
      sinon
        .stub(mobileVerificationInstance, "createSecretCode")
        .returns("ABC123");

      const result = await mobileVerificationInstance.startVerification();

      expect(result).to.have.property("secretCode", "ABC123");
      expect(result).to.have.property("mobile", "1234567890");
    });
  });

  describe("completeVerification", () => {
    it("should throw BadRequestError if mobile is already verified", async () => {
      sinon
        .stub(mobileVerificationInstance, "findUserById")
        .resolves({ mobileVerified: true });

      try {
        await mobileVerificationInstance.completeVerification();
        expect.fail("Expected BadRequestError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("errMsg_UserMobileAlreadyVerified");
      }
    });

    it("should throw NotAuthenticatedError if mobile verification request is missing", async () => {
      sinon
        .stub(mobileVerificationInstance, "findUserById")
        .resolves({ mobileVerified: false });
      sinon
        .stub(mobileVerificationInstance, "getMobileVerificationEntityCache")
        .resolves(null);

      try {
        await mobileVerificationInstance.completeVerification();
        expect.fail("Expected NotAuthenticatedError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(NotAuthenticatedError);
        expect(err.message).to.equal("errMsg_UserMobileCodeIsNotFoundInStore");
      }
    });

    it("should throw NotAuthenticatedError if mobile code has expired", async () => {
      sinon
        .stub(mobileVerificationInstance, "findUserById")
        .resolves({ mobileVerified: false });
      sinon
        .stub(mobileVerificationInstance, "getMobileVerificationEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now() - 999999999,
        });

      try {
        await mobileVerificationInstance.completeVerification();
        expect.fail("Expected NotAuthenticatedError");
      } catch (err) {
        expect(err).to.be.instanceOf(NotAuthenticatedError);
        expect(err.message).to.equal("errMsg_UserMobileCodeHasExpired");
      }
    });

    it("should throw ForbiddenError if secretCode is incorrect", async () => {
      sinon
        .stub(mobileVerificationInstance, "findUserById")
        .resolves({ mobileVerified: false });
      sinon
        .stub(mobileVerificationInstance, "getMobileVerificationEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now(),
        });

      req.body.secretCode = "XYZ789";

      try {
        await mobileVerificationInstance.completeVerification();
        expect.fail("Expected ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserMobileCodeIsNotAuthorized");
      }
    });

    it("should successfully complete mobile verification when the correct code is provided", async () => {
      sinon
        .stub(mobileVerificationInstance, "findUserById")
        .resolves({ mobileVerified: false });
      sinon
        .stub(mobileVerificationInstance, "getMobileVerificationEntityCache")
        .resolves({
          secretCode: "ABC123",
          isVerified: false,
          timeStamp: Date.now(),
        });
      sinon
        .stub(mobileVerificationInstance, "deleteMobileVerificationEntityCache")
        .resolves();
      sinon
        .stub(mobileVerificationInstance, "publishVerificationCompleteEvent")
        .resolves();
      sinon
        .stub(mobileVerificationInstance, "dbVerifyMobile")
        .resolves({ mobileVerified: true });

      req.body.secretCode = "ABC123";

      const result = await mobileVerificationInstance.completeVerification();

      expect(result).to.have.property("isVerified", true);
    });
  });
});
