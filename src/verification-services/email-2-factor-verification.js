const VerificationServiceBase = require("./verification-service-base");

const {
  ForbiddenError,
  NotAuthenticatedError,
  NotFoundError,
  ErrorCodes,
} = require("common");

class Email2Factor extends VerificationServiceBase {
  constructor(req) {
    super(req, "byLink");
    this.startTopic = "w1-user-service-email-2FA-start";
    this.completeTopic = "w1-user-service-email-2FA-complete";
  }

  async getEmail2faFromEntityCache(sessionId) {
    return this.getVStepFromEntityCache("email2fa", sessionId);
  }

  async setEmail2faToEntityCache(email2FA) {
    return this.setVStepToEntityCache("email2fa", email2FA.sessionId, email2FA);
  }

  async deleteEmail2faFromEntityCache(sessionId) {
    return this.deleteVStepFromEntityCache("email2fa", sessionId);
  }

  async start2Factor() {
    const userId = this.req.body.userId;
    const sessionId = this.req.body.sessionId;
    const reason = this.req.body.reason;
    const client = this.req.body.client;

    const user = await this.findUserById(userId);

    const email2FaDate = new Date();
    const email2FaTimeStamp = email2FaDate.getTime();

    const email2FA = (await this.getEmail2faFromEntityCache(sessionId)) ?? {
      userId,
      sessionId,
      email: user.email,
      reason,
      client,
    };

    const delta = email2FaTimeStamp - email2FA.timeStamp ?? email2FaTimeStamp;

    if (delta < 60 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeCanBeSentOnceInTheTimeWindow",
        ErrorCodes.CodeSpamError,
      );
    }

    let codeIndex = email2FA.codeIndex ?? 0;
    ++codeIndex;
    if (codeIndex > 10) codeIndex = 1;

    email2FA.secretCode = this.createSecretCode();
    email2FA.timeStamp = email2FaTimeStamp;
    email2FA.date = email2FaDate;
    email2FA.codeIndex = codeIndex;
    email2FA.expireTime = Number(86400);
    email2FA.verificationType = this.verificationType;

    await this.setEmail2faToEntityCache(email2FA);
    email2FA.user = user;
    this.publishVerificationStartEvent(email2FA);

    return email2FA;
  }

  async complete2Factor() {
    const userId = this.req.body.userId;
    const sessionId = this.req.body.sessionId;
    const email2FactorCode = this.req.body.secretCode;

    const user = await this.findUserById(userId);

    const email2FA = await this.getEmail2faFromEntityCache(sessionId);

    if (!email2FA) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeIsNotFoundInStore",
        ErrorCodes.StepNotFound,
      );
    }

    const email2FaDate = new Date();
    const email2FaTimeStamp = email2FaDate.getTime();

    const delta = email2FaTimeStamp - email2FA.timeStamp ?? email2FaTimeStamp;

    if (delta > 86400 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeHasExpired",
        ErrorCodes.CodeExpired,
      );
    }

    if (email2FA.secretCode == email2FactorCode) {
      const session = await this.hexaAuth.getSessionFromEntityCache(sessionId);
      if (!session) {
        throw new NotAuthenticatedError(
          "errMsg_UserSessionNotFound",
          ErrorCodes.SessionNotFound,
        );
      }
      session.sessionNeedsEmail2FA = false;
      await this.hexaAuth.setSessionToEntityCache(session);
      this.deleteEmail2faFromEntityCache(sessionId);
      this.publishVerificationCompleteEvent(email2FA);
      return session;
    } else {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeIsNotAuthorized",
        ErrorCodes.CodeMismatch,
      );
    }
  }
}

const startEmail2Factor = async (req, res, next) => {
  try {
    const email2Factor = new Email2Factor(req);
    const response = await email2Factor.start2Factor();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

const completeEmail2Factor = async (req, res, next) => {
  try {
    const email2Factor = new Email2Factor(req);
    const response = await email2Factor.complete2Factor();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

module.exports = { startEmail2Factor, completeEmail2Factor, Email2Factor };
