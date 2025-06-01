const { expect } = require("chai");
const sinon = require("sinon");
const {
  ForbiddenError,
  NotAuthenticatedError,
  NotFoundError,
  ErrorCodes,
} = require("common");
const {
  PasswordResetByMobile,
} = require("../../src/verification-services/password-reset-by-mobile");

describe("PasswordResetByMobile Service", function () {
  let req, res, next, passwordResetInstance;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    req = {
      body: {
        mobile: "1234567890",
        password: "newpassword123",
        secretCode: "ABC123",
        email: "test@example.com",
      },
      session: {},
    };
    res = {
      send: sinon.spy(),
      status: sinon.stub().returns({ json: sinon.spy() }),
    };
    next = sinon.spy();
    passwordResetInstance = new PasswordResetByMobile(req);
  });

  describe("startPasswordReset", () => {
    it("should throw NotFoundError if the mobile is not found", async () => {
      sinon.stub(passwordResetInstance, "findUserByMobile").resolves(null);

      try {
        await passwordResetInstance.startPasswordReset();
        expect.fail("Expected NotFoundError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
        expect(err.message).to.equal("errMsg_UserMobileNotFound");
      }
    });

    it("should throw ForbiddenError if the mobile reset code was sent less than 1 minute ago", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByMobile")
        .resolves({ id: "user123", mobile: "1234567890" });
      sinon
        .stub(passwordResetInstance, "getMobileResetFromEntityCache")
        .resolves({ timeStamp: Date.now() });

      try {
        await passwordResetInstance.startPasswordReset();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal(
          "errMsg_UserMobileCodeCanBeSentOnceInTheTimeWindow",
        );
      }
    });

    it("should successfully create a new mobile password reset request", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByMobile")
        .resolves({ id: "user123", mobile: "1234567890" });
      sinon
        .stub(passwordResetInstance, "getMobileResetFromEntityCache")
        .resolves(null);
      sinon
        .stub(passwordResetInstance, "setMobileResetToEntityCache")
        .resolves();
      sinon
        .stub(passwordResetInstance, "publishVerificationStartEvent")
        .resolves();
      sinon.stub(passwordResetInstance, "createSecretCode").returns("ABC123");

      const result = await passwordResetInstance.startPasswordReset();

      expect(result).to.have.property("secretCode", "ABC123");
      expect(result).to.have.property("mobile", "1234567890");
    });
  });

  describe("completePasswordReset", () => {
    it("should throw NotAuthenticatedError if the mobile is not found", async () => {
      sinon.stub(passwordResetInstance, "findUserByEmail").resolves(null);

      try {
        await passwordResetInstance.completePasswordReset();
        expect.fail("Expected NotAuthenticatedError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(NotAuthenticatedError);
        expect(err.message).to.equal("errMsg_UserMobileNotFound");
      }
    });

    it("should throw ForbiddenError if the mobile reset code is not found in store", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", mobile: "1234567890" });
      sinon
        .stub(passwordResetInstance, "getMobileResetFromEntityCache")
        .resolves(null);

      try {
        await passwordResetInstance.completePasswordReset();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserMobileCodeIsNotFoundInStore");
      }
    });

    it("should throw ForbiddenError if the mobile reset code has expired", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", mobile: "1234567890" });
      sinon
        .stub(passwordResetInstance, "getMobileResetFromEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now() - 999999999,
        });

      try {
        await passwordResetInstance.completePasswordReset();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserMobileCodeHasExpired");
      }
    });

    it("should throw ForbiddenError if the mobile reset code does not match", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", mobile: "1234567890" });
      sinon
        .stub(passwordResetInstance, "getMobileResetFromEntityCache")
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
        expect(err.message).to.equal("errMsg_UserMobileCodeIsNotAuthorized");
      }
    });

    it("should successfully complete password reset when the correct code is provided", async () => {
      sinon
        .stub(passwordResetInstance, "findUserByEmail")
        .resolves({ id: "user123", mobile: "1234567890" });
      sinon
        .stub(passwordResetInstance, "getMobileResetFromEntityCache")
        .resolves({
          secretCode: "ABC123",
          isVerified: false,
          timeStamp: Date.now(),
        });
      sinon
        .stub(passwordResetInstance, "dbResetPassword")
        .resolves({ id: "user123", mobileVerified: true });
      sinon
        .stub(passwordResetInstance, "deleteMobileResetFromEntityCache")
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
