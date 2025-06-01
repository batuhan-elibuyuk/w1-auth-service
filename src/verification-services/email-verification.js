const VerificationServiceBase = require("./verification-service-base");

const {
  ForbiddenError,
  NotAuthenticatedError,
  BadRequestError,
  ErrorCodes,
} = require("common");

class EmailVerification extends VerificationServiceBase {
  constructor(req) {
    super(req, "byLink");
    this.startTopic = "w1-user-service-email-verification-start";
    this.completeTopic = "w1-user-service-email-verification-complete";
  }

  async getEmailVerificationEntityCache(userId) {
    return this.getVStepFromEntityCache("emailVerification", userId);
  }

  async setEmailVerificationEntityCache(emailVerification) {
    return this.setVStepToEntityCache(
      "emailVerification",
      emailVerification.userId,
      emailVerification,
    );
  }

  async deleteEmailVerificationEntityCache(userId) {
    return this.deleteVStepFromEntityCache("emailVerification", userId);
  }

  async startVerification() {
    const email = this.req.body.email;

    const user = await this.findUserByEmail(email);

    if (user.emailVerified) {
      throw new BadRequestError(
        "errMsg_UserEmailAlreadyVerified",
        ErrorCodes.EmailAlreadyVerified,
      );
    }

    const emailVerificationDate = new Date();
    const emailVerificationTimeStamp = emailVerificationDate.getTime();

    const emailVerification = (await this.getEmailVerificationEntityCache(
      user.id,
    )) ?? {
      userId: user.id,
      email: user.email,
    };

    const delta =
      emailVerificationTimeStamp - emailVerification.timeStamp ??
      emailVerificationTimeStamp;

    if (delta < 60 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeCanBeSentOnceInTheTimeWindow",
        ErrorCodes.CodeSpamError,
      );
    }

    let codeIndex = emailVerification.codeIndex ?? 0;
    ++codeIndex;
    if (codeIndex > 10) codeIndex = 1;

    emailVerification.secretCode = this.createSecretCode();
    emailVerification.timeStamp = emailVerificationTimeStamp;
    emailVerification.date = emailVerificationDate;
    emailVerification.codeIndex = codeIndex;
    emailVerification.expireTime = Number(86400);
    emailVerification.user = user;
    emailVerification.verificationType = this.verificationType;

    this.setEmailVerificationEntityCache(emailVerification);
    this.publishVerificationStartEvent(emailVerification);

    return emailVerification;
  }

  async completeVerification() {
    const userId = this.req.body.userId;
    const user = await this.findUserById(userId);

    if (user.emailVerified) {
      throw new ForbiddenError(
        "errMsg_UserEmailAlreadyVerified",
        ErrorCodes.EmailAlreadyVerified,
      );
    }

    const emailVerification =
      await this.getEmailVerificationEntityCache(userId);

    if (!emailVerification) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeIsNotFoundInStore",
        ErrorCodes.StepNotFound,
      );
    }

    const emailVerificationTimeStamp = new Date();
    const delta =
      emailVerificationTimeStamp - emailVerification.timeStamp ??
      emailVerificationTimeStamp;

    if (delta > Number(86400) * 1000) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeHasExpired",
        ErrorCodes.CodeExpired,
      );
    }

    if (emailVerification.secretCode == this.req.body.secretCode) {
      const newUser = await this.dbVerifyEmail(userId);
      emailVerification.user = newUser;
      emailVerification.isVerified = true;
      this.deleteEmailVerificationEntityCache(userId);
      this.publishVerificationCompleteEvent(emailVerification);
      return emailVerification;
    } else {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeIsNotAuthorized",
        ErrorCodes.CodeMismatch,
      );
    }
  }
}

const startEmailVerification = async (req, res, next) => {
  try {
    const emailVerification = new EmailVerification(req);
    const response = await emailVerification.startVerification();
    console.log(response);
    res.send(response);
  } catch (err) {
    next(err);
  }
};

const completeEmailVerification = async (req, res, next) => {
  try {
    const emailVerification = new EmailVerification(req);
    console.log("complete email verification", req.body);
    const response = await emailVerification.completeVerification();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startEmailVerification,
  completeEmailVerification,
  EmailVerification,
};
