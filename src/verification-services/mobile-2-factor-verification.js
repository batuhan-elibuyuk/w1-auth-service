const VerificationServiceBase = require("./verification-service-base");

const {
  ForbiddenError,
  NotAuthenticatedError,
  NotFoundError,
  BadRequestError,
  HttpServerError,
  ErrorCodes,
} = require("common");

class Mobile2Factor extends VerificationServiceBase {
  constructor(req) {
    super(req, "byLink");
    this.startTopic = "w1-user-service-mobile-2FA-start";
    this.completeTopic = "w1-user-service-mobile-2FA-complete";
  }

  async getMobile2faFromEntityCache(sessionId) {
    return this.getVStepFromEntityCache("mobile2fa", sessionId);
  }

  async setMobile2faToEntityCache(mobile2FA) {
    return this.setVStepToEntityCache(
      "mobile2fa",
      mobile2FA.sessionId,
      mobile2FA,
    );
  }

  async deleteMobile2faFromEntityCache(sessionId) {
    return this.deleteVStepFromEntityCache("mobile2fa", sessionId);
  }

  async start2Factor() {
    const userId = this.req.body.userId;
    const sessionId = this.req.body.sessionId;
    const reason = this.req.body.reason;
    const client = this.req.body.client;

    const user = await this.findUserById(userId);

    if (!user.mobileVerified) {
      throw new ForbiddenError(
        "errMsg_UserMobileNeedsVerification",
        ErrorCodes.MobileVerificationNeeded,
      );
    }

    const mobile2FaDate = new Date();
    const mobile2FaTimeStamp = mobile2FaDate.getTime();

    const mobile2FA = (await this.getMobile2faFromEntityCache(sessionId)) ?? {
      userId,
      sessionId,
      mobile: user.mobile,
      reason,
      client,
    };

    const delta =
      mobile2FaTimeStamp - mobile2FA.timeStamp ?? mobile2FaTimeStamp;

    if (delta < 60 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeCanBeSentOnceInTheTimeWindow",
        ErrorCodes.CodeSpamError,
      );
    }

    let codeIndex = mobile2FA.codeIndex ?? 0;
    ++codeIndex;
    if (codeIndex > 10) codeIndex = 1;

    mobile2FA.secretCode = this.createSecretCode();
    mobile2FA.timeStamp = mobile2FaTimeStamp;
    mobile2FA.date = mobile2FaDate;
    mobile2FA.codeIndex = codeIndex;
    mobile2FA.expireTime = Number(60);
    mobile2FA.verificationType = this.verificationType;
    this.setMobile2faToEntityCache(mobile2FA);

    mobile2FA.user = user;

    this.publishVerificationStartEvent(mobile2FA);
    return mobile2FA;
  }

  async complete2Factor() {
    const userId = this.req.body.userId;
    const sessionId = this.req.body.sessionId;
    const mobile2FactorCode = this.req.body.secretCode;

    const user = await this.findUserById(userId);

    const mobile2FA = await this.getMobile2faFromEntityCache(sessionId);

    if (!mobile2FA) {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeIsNotFoundInStore",
        ErrorCodes.StepNotFound,
      );
    }

    const mobile2FaDate = new Date();
    const mobile2FaTimeStamp = mobile2FaDate.getTime();

    const delta =
      mobile2FaTimeStamp - mobile2FA.timeStamp ?? mobile2FaTimeStamp;

    if (delta > 86400 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeHasExpired",
        ErrorCodes.CodeExpired,
      );
    }

    if (mobile2FA.secretCode == mobile2FactorCode) {
      const session = await this.hexaAuth.getSessionFromEntityCache(sessionId);
      if (!session) {
        throw new NotAuthenticatedError(
          "errMsg_UserSessionNotFound",
          ErrorCodes.SessionNotFound,
        );
      }
      session.sessionNeedsMobile2FA = false;
      await this.hexaAuth.setSessionToEntityCache(session);
      this.deleteMobile2faFromEntityCache(sessionId);
      return session;
    } else {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeIsNotAuthorized",
        ErrorCodes.CodeMismatch,
      );
    }
  }
}

const startMobile2Factor = async (req, res, next) => {
  try {
    const mobile2Factor = new Mobile2Factor(req);
    const response = await mobile2Factor.start2Factor();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

const completeMobile2Factor = async (req, res, next) => {
  try {
    const mobile2Factor = new Mobile2Factor(req);
    const response = await mobile2Factor.complete2Factor();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

module.exports = { startMobile2Factor, completeMobile2Factor, Mobile2Factor };
