const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("WLoginSession", () => {
  let session, mocks;

  beforeEach(() => {
    process.env.COOKIE_URL = "localhost";

    mocks = {
      getUserByQuery: sinon.stub(),
      createUser: sinon.stub(),
      updateUserById: sinon.stub(),
      getById: sinon.stub(),
      create: sinon.stub(),
      getById: sinon.stub(),
      hashCompare: sinon.stub(),
      hashString: sinon.stub().returns("hashed"),
      createHexCode: sinon.stub().returns("hexcode"),
      getRedisData: sinon.stub(),
      setRedisData: sinon.stub(),
    };

    const LoginSession = proxyquire(
      "../../src/project-session/w-login-session",
      {
        dbLayer: mocks,
        common: {
          createHexCode: mocks.createHexCode,
          getRedisData: mocks.getRedisData,
          setRedisData: mocks.setRedisData,
          hashCompare: mocks.hashCompare,
          hashString: mocks.hashString,
          HttpServerError: class extends Error {},
          ForbiddenError: class extends Error {},
          NotAuthenticatedError: class extends Error {},
          ErrorCodes: {
            UserNotFound: "UserNotFound",
            WrongPassword: "WrongPassword",
            UserTenantMismatch: "UserTenantMismatch",
            EmailVerficationNeeded: "EmailVerficationNeeded",
            MobileVerificationNeeded: "MobileVerificationNeeded",
            UserLoginWithoutCredentials: "UserLoginWithoutCredentials",
          },
        },
        "../../src/project-session/w-session": class {
          readTenantIdFromRequest = sinon.stub();
          buildSessionFromRequest = sinon.stub();
          setServiceSession = sinon.stub();
          setSessionToEntityCache = sinon.stub();
          collectAndSetPermissionsToSession = sinon.stub();
          createTokenFromSession = sinon.stub().resolves("jwt-token");
        },
      },
    );

    session = new LoginSession();
    session._clientId = "client123";
    session.superAdminId = "superadmin";
    session.rootTenantId = "rootClient";
    session.tokenLocation = "cookie";
    session.setSessionToEntityCache = sinon.stub();
    session.createTokenFromSession = sinon.stub().resolves("jwt-token");
    session.collectAndSetPermissionsToSession = sinon.stub();
  });

  it("invalidateUserAuthInSession should set userAuthUpdate flag", async () => {
    mocks.getRedisData.resolves("sess123");
    await session.invalidateUserAuthInSession("user1");
    expect(mocks.setRedisData.calledWith("hexauserauthupdate:user1", "true")).to
      .be.true;
  });

  describe("initSuperAdmin", () => {
    it("should create super admin user if not exists", async () => {
      mocks.getUserById = sinon.stub().resolves(null);
      const { createUser, updateUserById } = mocks;
      session.superAdminId = "superadmin";
      session.rootTenantId = "rootClient";
      await session.initSuperAdmin();
      expect(mocks.createUser.calledOnce).to.be.true;
    });
  });

  describe("loginUser", () => {
    it("should throw if user not found", async () => {
      mocks.getUserByQuery.resolves(null);
      try {
        await session.loginUser({
          username: "email@test.com",
          password: "1234",
        });
      } catch (err) {
        expect(err.message).to.equal("errMsg_UserNotFound");
      }
    });

    it("should throw if password doesn't match", async () => {
      mocks.getUserByQuery.resolves({ password: "hashed" });
      mocks.hashCompare.returns(false);
      try {
        await session.loginUser({
          username: "email@test.com",
          password: "1234",
        });
      } catch (err) {
        expect(err.message).to.equal("errMsg_PasswordDoesntMatch");
      }
    });

    it("should throw if email is not verified", async () => {
      mocks.getUserByQuery.resolves({
        password: "hashed",
        emailVerified: false,
        mobileVerified: true,
      });
      mocks.hashCompare.returns(true);
      try {
        await session.loginUser({
          username: "email@test.com",
          password: "1234",
        });
      } catch (err) {
        expect(err.message).to.equal("errMsg_EmailNotVerified");
      }
    });

    it("should return session if valid login", async () => {
      mocks.getUserByQuery.resolves({
        id: "user1",
        password: "hashed",
        emailVerified: true,
        mobileVerified: true,
        isAbsolute: false,
        clientId: "client123",
      });
      mocks.getById.resolves({ name: "ClientName" });
      mocks.hashCompare.returns(true);
      const result = await session.loginUser({
        username: "email@test.com",
        password: "1234",
      });
      expect(result._USERID).to.equal("user1");
    });
  });

  describe("verifySessionToken", () => {
    it("should call next() if session is valid", async () => {
      const next = sinon.spy();
      session.readTenantIdFromRequest = sinon.stub();
      session.buildSessionFromRequest = sinon.stub();
      session.session = { sessionId: "abc", userAuthUpdate: false };
      await session.verifySessionToken({}, {}, next);
      expect(next.called).to.be.true;
    });
  });

  describe("setLoginToRequest", () => {
    it("should set req.session and token", async () => {
      const sessionData = {
        id: "u1",
        userId: "u1",
        emailVerified: true,
        mobileVerified: true,
        isAbsolute: false,
      };

      session.loginUser = sinon.stub().resolves(sessionData);
      session.setSessionToEntityCache = sinon.stub().resolves();
      session.createTokenFromSession = sinon.stub().resolves("jwt-token");

      const req = {};
      await session.setLoginToRequest(
        req,
        { username: "a", password: "b" },
        null,
      );
      expect(req.session).to.have.property("accessToken", "jwt-token");
      expect(session.tokenName).to.equal("babilShop-access-token-client123");
    });
  });

  describe("loginUserController", () => {
    it("should respond with session when login succeeds", async () => {
      process.env.COOKIE_URL = "localhost";
      const req = { body: { username: "a", password: "b" } };
      const res = {
        set: sinon.stub().returnsThis(),
        cookie: sinon.stub().returnsThis(),
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };
      const next = sinon.stub();

      session.setLoginToRequest = sinon.stub().callsFake((req) => {
        req.session = { id: "session", accessToken: "jwt-token" };
        session.tokenName = "token";
        session.accessToken = "jwt-token";
        session.session = req.session;
      });

      await session.loginUserController(req, res, next);

      expect(res.set.calledWith("token", "jwt-token")).to.be.true;
      expect(res.cookie.calledWith("token", "jwt-token")).to.be.true;
      expect(res.send.calledOnce).to.be.true;
    });
    it("should call next with error when login fails", async () => {
      const req = { body: { username: "a", password: "b" } };
      const res = {
        set: sinon.stub().returnsThis(),
        cookie: sinon.stub().returnsThis(),
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };
      const next = sinon.stub();

      session.setLoginToRequest = sinon.stub().rejects(new Error("fail"));

      await session.loginUserController(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(Error);
    });
  });
});
