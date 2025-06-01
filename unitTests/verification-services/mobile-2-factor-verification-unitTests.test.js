const { expect } = require("chai");
const sinon = require("sinon");
const { ForbiddenError, NotAuthenticatedError, ErrorCodes } = require("common");
const {
  Mobile2Factor,
} = require("../../src/verification-services/mobile-2-factor-verification");

describe("Mobile2Factor Service", function () {
  let req, res, next, mobile2FactorInstance;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    req = {
      body: {
        userId: "user123",
        sessionId: "session123",
        reason: "login",
        secretCode: "123456",
      },
      session: {},
    };
    res = {
      send: sinon.spy(),
      status: sinon.stub().returns({ json: sinon.spy() }),
    };
    next = sinon.spy();
    mobile2FactorInstance = new Mobile2Factor(req);
  });

  describe("start2Factor", () => {
    it("should throw ForbiddenError if user's mobile is not verified", async () => {
      sinon
        .stub(mobile2FactorInstance, "findUserById")
        .resolves({ mobileVerified: false });

      try {
        await mobile2FactorInstance.start2Factor();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserMobileNeedsVerification");
      }
    });

    it("should successfully create a new mobile 2FA request", async () => {
      sinon.stub(mobile2FactorInstance, "findUserById").resolves({
        id: "user123",
        mobileVerified: true,
        mobile: "1234567890",
      });
      sinon
        .stub(mobile2FactorInstance, "getMobile2faFromEntityCache")
        .resolves(null);
      sinon.stub(mobile2FactorInstance, "setMobile2faToEntityCache").resolves();
      sinon
        .stub(mobile2FactorInstance, "publishVerificationStartEvent")
        .resolves();
      sinon.stub(mobile2FactorInstance, "createSecretCode").returns("123456");

      const result = await mobile2FactorInstance.start2Factor();

      expect(result).to.have.property("secretCode", "123456");
      expect(result).to.have.property("mobile", "1234567890");
    });

    it("should throw ForbiddenError if the mobile 2FA code was sent less than 1 minute ago", async () => {
      sinon.stub(mobile2FactorInstance, "findUserById").resolves({
        id: "user123",
        mobileVerified: true,
        mobile: "1234567890",
      });
      sinon
        .stub(mobile2FactorInstance, "getMobile2faFromEntityCache")
        .resolves({ timeStamp: Date.now() });

      try {
        await mobile2FactorInstance.start2Factor();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal(
          "errMsg_UserMobileCodeCanBeSentOnceInTheTimeWindow",
        );
      }
    });
  });

  describe("complete2Factor", () => {
    it("should throw ForbiddenError if the mobile 2FA code is not found in store", async () => {
      sinon
        .stub(mobile2FactorInstance, "findUserById")
        .resolves({ mobileVerified: true });
      sinon
        .stub(mobile2FactorInstance, "getMobile2faFromEntityCache")
        .resolves(null);

      try {
        await mobile2FactorInstance.complete2Factor();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserMobileCodeIsNotFoundInStore");
      }
    });

    it("should throw ForbiddenError if the mobile 2FA code has expired", async () => {
      sinon
        .stub(mobile2FactorInstance, "findUserById")
        .resolves({ mobileVerified: true });
      sinon
        .stub(mobile2FactorInstance, "getMobile2faFromEntityCache")
        .resolves({
          secretCode: "123456",
          timeStamp: Date.now() - 999999999,
        });

      try {
        await mobile2FactorInstance.complete2Factor();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserMobileCodeHasExpired");
      }
    });

    it("should throw ForbiddenError if the code is incorrect", async () => {
      sinon
        .stub(mobile2FactorInstance, "findUserById")
        .resolves({ mobileVerified: true });
      sinon
        .stub(mobile2FactorInstance, "getMobile2faFromEntityCache")
        .resolves({
          secretCode: "ABC123",
          timeStamp: Date.now(),
        });

      req.body.secretCode = "WRONGCODE";

      try {
        await mobile2FactorInstance.complete2Factor();
        expect.fail("Expected ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserMobileCodeIsNotAuthorized");
      }
    });

    it("should throw NotAuthenticatedError if session is not found", async () => {
      sinon
        .stub(mobile2FactorInstance, "findUserById")
        .resolves({ mobileVerified: true });
      sinon
        .stub(mobile2FactorInstance, "getMobile2faFromEntityCache")
        .resolves({
          secretCode: "123456",
          timeStamp: Date.now(),
        });
      sinon.stub(mobile2FactorInstance, "hexaAuth").value({
        getSessionFromEntityCache: sinon.stub().resolves(null),
      });

      try {
        await mobile2FactorInstance.complete2Factor();
        expect.fail("Expected NotAuthenticatedError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(NotAuthenticatedError);
        expect(err.message).to.equal("errMsg_UserSessionNotFound");
      }
    });

    it("should successfully complete mobile 2FA when the correct code is provided", async () => {
      const sessionData = {
        sessionId: "session123",
        sessionNeedsMobile2FA: true,
      };

      sinon
        .stub(mobile2FactorInstance, "findUserById")
        .resolves({ mobileVerified: true });
      sinon
        .stub(mobile2FactorInstance, "getMobile2faFromEntityCache")
        .resolves({
          secretCode: "123456",
          timeStamp: Date.now(),
        });
      sinon.stub(mobile2FactorInstance, "hexaAuth").value({
        getSessionFromEntityCache: sinon.stub().resolves(sessionData),
        setSessionToEntityCache: sinon.stub().resolves(),
      });
      sinon
        .stub(mobile2FactorInstance, "deleteMobile2faFromEntityCache")
        .resolves();
      sinon
        .stub(mobile2FactorInstance, "publishVerificationCompleteEvent")
        .resolves();

      req.body.secretCode = "123456";

      const result = await mobile2FactorInstance.complete2Factor();

      expect(result).to.have.property("sessionId", "session123");
      expect(result).to.have.property("sessionNeedsMobile2FA", false);
    });
  });
});
