const { expect } = require("chai");
const sinon = require("sinon");
const { ForbiddenError, BadRequestError, ErrorCodes } = require("common");
const {
  EmailVerification,
} = require("../../src/verification-services/email-verification");

describe("EmailVerification Service", function () {
  let req, res, next, emailVerificationInstance;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
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
    emailVerificationInstance = new EmailVerification(req);
  });

  describe("startVerification", () => {
    it("should throw BadRequestError if the email is already verified", async () => {
      sinon
        .stub(emailVerificationInstance, "findUserByEmail")
        .resolves({ emailVerified: true });

      try {
        await emailVerificationInstance.startVerification();
        expect.fail("Expected BadRequestError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("errMsg_UserEmailAlreadyVerified");
      }
    });

    it("should successfully create a new email verification request", async () => {
      sinon.stub(emailVerificationInstance, "findUserByEmail").resolves({
        id: "user123",
        emailVerified: false,
        email: "test@example.com",
      });

      sinon
        .stub(emailVerificationInstance, "getEmailVerificationEntityCache")
        .resolves(null);
      sinon
        .stub(emailVerificationInstance, "setEmailVerificationEntityCache")
        .resolves();
      sinon
        .stub(emailVerificationInstance, "publishVerificationStartEvent")
        .resolves();
      sinon
        .stub(emailVerificationInstance, "createSecretCode")
        .returns("ABC123");

      const result = await emailVerificationInstance.startVerification();

      expect(result).to.have.property("secretCode", "ABC123");
      expect(result).to.have.property("email", "test@example.com");
    });
  });

  describe("completeVerification", () => {
    it("should throw ForbiddenError if email is already verified", async () => {
      sinon
        .stub(emailVerificationInstance, "findUserById")
        .resolves({ emailVerified: true });

      try {
        await emailVerificationInstance.completeVerification();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailAlreadyVerified");
      }
    });

    it("should throw ForbiddenError if email verification request is missing", async () => {
      sinon
        .stub(emailVerificationInstance, "findUserById")
        .resolves({ emailVerified: false });
      sinon
        .stub(emailVerificationInstance, "getEmailVerificationEntityCache")
        .resolves(null);

      try {
        await emailVerificationInstance.completeVerification();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeIsNotFoundInStore");
      }
    });

    it("should throw ForbiddenError if secretCode is expired", async () => {
      sinon
        .stub(emailVerificationInstance, "findUserById")
        .resolves({ emailVerified: false });
      sinon
        .stub(emailVerificationInstance, "getEmailVerificationEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now() - 999999999,
        });

      try {
        await emailVerificationInstance.completeVerification();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeHasExpired");
      }
    });

    it("should throw ForbiddenError if secretCode is incorrect", async () => {
      sinon
        .stub(emailVerificationInstance, "findUserById")
        .resolves({ emailVerified: false });
      sinon
        .stub(emailVerificationInstance, "getEmailVerificationEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now(),
        });

      req.body.secretCode = "XYZ789";

      try {
        await emailVerificationInstance.completeVerification();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeIsNotAuthorized");
      }
    });

    it("should successfully complete email verification when the correct code is provided", async () => {
      sinon
        .stub(emailVerificationInstance, "findUserById")
        .resolves({ emailVerified: false });
      sinon
        .stub(emailVerificationInstance, "getEmailVerificationEntityCache")
        .resolves({
          secretCode: "ABC123",
          isVerified: false,
          timeStamp: Date.now(),
        });
      sinon
        .stub(emailVerificationInstance, "deleteEmailVerificationEntityCache")
        .resolves();
      sinon
        .stub(emailVerificationInstance, "publishVerificationCompleteEvent")
        .resolves();
      sinon
        .stub(emailVerificationInstance, "dbVerifyEmail")
        .resolves({ emailVerified: true });

      req.body.secretCode = "ABC123";

      const result = await emailVerificationInstance.completeVerification();

      expect(result).to.have.property("isVerified", true);
    });
  });
});
