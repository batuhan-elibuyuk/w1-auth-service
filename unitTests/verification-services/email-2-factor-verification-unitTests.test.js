require("module-alias/register");
const { expect } = require("chai");
const sinon = require("sinon");
const {
  Email2Factor,
  startEmail2Factor,
  completeEmail2Factor,
} = require("../../src/verification-services/email-2-factor-verification");
const { ForbiddenError, NotAuthenticatedError } = require("common");
const HexaAuth = require("../../src/project-session/hexa-auth");

describe("Email2Factor Service", function () {
  let req, res, next, email2FactorInstance, hexaAuthStub;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    hexaAuthStub = sinon.createStubInstance(HexaAuth);

    hexaAuthStub.getSessionFromEntityCache.resolves({
      sessionId: "session123",
      sessionNeedsEmail2FA: true,
    });

    req = {
      body: {
        userId: "5f50c31a0b6c3f3c7074b9b1",
        sessionId: "5f50c31a0b6c3f3c7074b9b2",
        reason: "login",
        client: "web",
        secretCode: "123456",
      },
      auth: hexaAuthStub,
      session: {},
    };
    res = {
      send: sinon.spy(),
    };
    next = sinon.spy();

    email2FactorInstance = new Email2Factor(req);
  });

  describe("startEmail2Factor", () => {
    it("should throw ForbiddenError if email2FA was sent less than 1 minute ago", async () => {
      sinon
        .stub(email2FactorInstance, "findUserById")
        .resolves({ id: 123, email: "user@example.com" });
      sinon
        .stub(email2FactorInstance, "getEmail2faFromEntityCache")
        .resolves({ timeStamp: Date.now() });
      sinon.stub(email2FactorInstance, "createSecretCode").returns("123456");

      try {
        await email2FactorInstance.start2Factor();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal(
          "errMsg_UserEmailCodeCanBeSentOnceInTheTimeWindow",
        );
      }
    });

    it("should successfully create a new 2FA code if enough time has passed", async () => {
      sinon
        .stub(email2FactorInstance, "getEmail2faFromEntityCache")
        .resolves(null);
      sinon
        .stub(email2FactorInstance, "findUserById")
        .resolves({ id: 123, email: "user@example.com" });
      sinon.stub(email2FactorInstance, "setEmail2faToEntityCache").resolves();
      sinon
        .stub(email2FactorInstance, "publishVerificationStartEvent")
        .resolves();
      sinon.stub(email2FactorInstance, "createSecretCode").returns("123456");

      const result = await email2FactorInstance.start2Factor();

      expect(result).to.have.property("secretCode", "123456");
      expect(result).to.have.property("timeStamp");
      expect(result.codeIndex).to.be.a("number");
    });
  });

  describe("completeEmail2Factor", () => {
    it("should throw ForbiddenError if email2FA code is incorrect", async () => {
      sinon
        .stub(email2FactorInstance, "getEmail2faFromEntityCache")
        .resolves({ secretCode: "654321", timeStamp: Date.now() });
      sinon
        .stub(email2FactorInstance, "findUserById")
        .resolves({ email: "test@example.com" });

      req.body.secretCode = "123456"; // Incorrect code

      try {
        await email2FactorInstance.complete2Factor();
        expect.fail("Expected ForbiddenError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeIsNotAuthorized");
      }
    });

    it("should throw ForbiddenError if secretCode is expired", async () => {
      sinon.stub(email2FactorInstance, "getEmail2faFromEntityCache").resolves({
        secretCode: "123456",
        timeStamp: Date.now() - 999999999,
      });
      sinon
        .stub(email2FactorInstance, "findUserById")
        .resolves({ email: "test@example.com" });

      try {
        await email2FactorInstance.complete2Factor();
        expect.fail("Expected ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("errMsg_UserEmailCodeHasExpired");
      }
    });

    it("should throw NotAuthenticatedError if session is not found", async () => {
      const hexaAuthStub2 = sinon.createStubInstance(HexaAuth);
      hexaAuthStub2.getSessionFromEntityCache.resolves(null);

      const req2 = {
        body: {
          userId: "5f50c31a0b6c3f3c7074b9b1",
          sessionId: "5f50c31a0b6c3f3c7074b9b2",
          secretCode: "123456",
        },
        auth: hexaAuthStub2,
        session: {},
      };

      const instance = new Email2Factor(req2);
      sinon
        .stub(instance, "findUserById")
        .resolves({ email: "test@example.com" });
      sinon
        .stub(instance, "getEmail2faFromEntityCache")
        .resolves({ secretCode: "123456", sessionId: req2.body.sessionId });

      try {
        await instance.complete2Factor();
        expect.fail("Expected NotAuthenticatedError but got no error");
      } catch (err) {
        expect(err).to.be.instanceOf(NotAuthenticatedError);
        expect(err.message).to.equal("errMsg_UserSessionNotFound");
      }
    });

    it("should successfully complete 2FA and return the session", async () => {
      sinon
        .stub(email2FactorInstance, "findUserById")
        .resolves({ email: "test@example.com" });
      sinon.stub(email2FactorInstance, "getEmail2faFromEntityCache").resolves({
        secretCode: "123456",
        timeStamp: Date.now(),
        sessionId: req.body.sessionId,
      });
      sinon
        .stub(email2FactorInstance, "deleteEmail2faFromEntityCache")
        .resolves();
      sinon
        .stub(email2FactorInstance, "publishVerificationCompleteEvent")
        .resolves();
      hexaAuthStub.setSessionToEntityCache.resolves();

      const session = await email2FactorInstance.complete2Factor();

      expect(session).to.deep.equal({
        sessionId: "session123",
        sessionNeedsEmail2FA: false,
      });
    });
  });
});
