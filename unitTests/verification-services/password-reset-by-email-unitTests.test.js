const { expect } = require("chai");
const sinon = require("sinon");
const { ForbiddenError, NotAuthenticatedError, ErrorCodes } = require("common");
const {
  PasswordResetByEmail,
} = require("../../src/verification-services/password-reset-by-email");

describe("PasswordResetByEmail Service", function () {
  let req, res, next, passwordResetInstance;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password: "newpassword123",
        secretCode: "ABC123",
      },
      session: {},
    };
    res = {
      send: sinon.spy(),
      status: sinon.stub().returns({ json: sinon.spy() }),
    };
    next = sinon.spy();
    passwordResetInstance = new PasswordResetByEmail(req);
  });

  describe("startPasswordResetByEmail", () => {
    it("should throw NotAuthenticatedError if the email is not found", async () => {
      sinon.stub(passwordResetInstance, "findUserByEmail").resolves(null);

      try {
        await passwordResetInstance.startPasswordResetByEmail();
        expect.fail("Expected NotAuthenticatedError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(NotAuthenticatedError);
        expect(err.message).to.equal("errMsg_UserEmailNotFound");
      }
    });

    it("should throw ForbiddenError if the email reset code was sent less than 1 minute ago", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", email: "test@example.com" });
      sinon
        .stub(passwordResetInstance, "getEmailResetFromEntityCache")
        .resolves({ timeStamp: Date.now() });

      try {
        await passwordResetInstance.startPasswordResetByEmail();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal(
          "errMsg_UserEmailCodeCanBeSentOnceInTheTimeWindow",
        );
      }
    });

    it("should successfully create a new password reset request", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", email: "test@example.com" });
      sinon
        .stub(passwordResetInstance, "getEmailResetFromEntityCache")
        .resolves(null);
      sinon
        .stub(passwordResetInstance, "setEmailResetToEntityCache")
        .resolves();
      sinon.stub(passwordResetInstance, "createSecretCode").returns("ABC123");

      const result = await passwordResetInstance.startPasswordResetByEmail();

      expect(result).to.have.property("secretCode", "ABC123");
      expect(result).to.have.property("email", "test@example.com");
    });
  });

  describe("completePasswordReset", () => {
    it("should throw ForbiddenError if the email reset code is not found in store", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", email: "test@example.com" });
      sinon
        .stub(passwordResetInstance, "getEmailResetFromEntityCache")
        .resolves(null);

      try {
        await passwordResetInstance.completePasswordReset();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeIsNotFoundInStore");
      }
    });

    it("should throw ForbiddenError if the email reset code has expired", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", email: "test@example.com" });
      sinon
        .stub(passwordResetInstance, "getEmailResetFromEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now() - 999999999,
        });

      try {
        await passwordResetInstance.completePasswordReset();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeHasExpired");
      }
    });

    it("should throw ForbiddenError if the email reset code does not match", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", email: "test@example.com" });
      sinon
        .stub(passwordResetInstance, "getEmailResetFromEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now(),
        });

      req.body.secretCode = "XYZ789";

      try {
        await passwordResetInstance.completePasswordReset();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeIsNotAuthorized");
      }
    });

    it("should successfully complete password reset when the correct code is provided", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", email: "test@example.com" });
      sinon
        .stub(passwordResetInstance, "getEmailResetFromEntityCache")
        .resolves({
          secretCode: "ABC123",
          isVerified: false,
          timeStamp: Date.now(),
        });
      sinon
        .stub(passwordResetInstance, "dbResetPassword")
        .resolves({ id: "user123", emailVerified: true });
      sinon
        .stub(passwordResetInstance, "deleteEmailResetFromEntityCache")
        .resolves();
      sinon
        .stub(passwordResetInstance, "publishVerificationCompleteEvent")
        .resolves();

      req.body.secretCode = "ABC123";

      const result = await passwordResetInstance.completePasswordReset();

      expect(result).to.have.property("isVerified", true);
      expect(result).to.have.property("secretCode", "ABC123");
    });
  });
});
