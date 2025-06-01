const VerificationServiceBase = require("./verification-service-base");

const {
  ForbiddenError,
  NotAuthenticatedError,
  BadRequestError,
  ErrorCodes,
} = require("common");

class PasswordResetByEmail extends VerificationServiceBase {
  constructor(req) {
    super(req, "byLink");
    this.startTopic = "w1-user-service-password-reset-by-email-start";
    this.completeTopic = "w1-user-service-password-reset-by-email-complete";
  }

  async getEmailResetFromEntityCache(userId) {
    return this.getVStepFromEntityCache("emailReset", userId);
  }

  async setEmailResetToEntityCache(emailReset) {
    return this.setVStepToEntityCache(
      "emailReset",
      emailReset.userId,
      emailReset,
    );
  }

  async deleteEmailResetFromEntityCache(userId) {
    return this.deleteVStepFromEntityCache("emailReset", userId);
  }

  async startPasswordResetByEmail() {
    const email = this.req.body.email;
    let user = await this.findUserByEmail(email);

    if (!user) {
      throw new NotAuthenticatedError(
        "errMsg_UserEmailNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    const userId = user.id;

    const emailResetDate = new Date();
    const emailResetTimeStamp = emailResetDate.getTime();

    const emailReset = (await this.getEmailResetFromEntityCache(userId)) ?? {
      userId: userId,
      email: user.email,
    };

    const delta =
      emailResetTimeStamp - emailReset.timeStamp ?? emailResetTimeStamp;

    if (delta < 60 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeCanBeSentOnceInTheTimeWindow",
        ErrorCodes.CodeSpamError,
      );
    }

    let codeIndex = emailReset.codeIndex ?? 0;
    ++codeIndex;
    if (codeIndex > 10) codeIndex = 1;

    emailReset.secretCode = this.createSecretCode();
    emailReset.timeStamp = emailResetTimeStamp;
    emailReset.date = emailResetDate;
    emailReset.codeIndex = codeIndex;
    emailReset.expireTime = Number(86400);
    emailReset.verificationType = this.verificationType;

    await this.setEmailResetToEntityCache(emailReset);

    emailReset.user = user;
    this.publishVerificationStartEvent(emailReset);

    return emailReset;
  }

  async completePasswordReset() {
    const password = this.req.body.password;
    const emailCode = this.req.body.secretCode;
    const email = this.req.body.email;

    const user = await this.findUserByEmail(email);

    const userId = user.id;
    const emailReset = await this.getEmailResetFromEntityCache(userId);

    if (!emailReset) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeIsNotFoundInStore",
        ErrorCodes.StepNotFound,
      );
    }

    const emailResetTimeStamp = new Date();
    const delta =
      emailResetTimeStamp - emailReset.timeStamp ?? emailResetTimeStamp;

    if (delta > 86400 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeHasExpired",
        ErrorCodes.CodeExpired,
      );
    }

    if (emailReset.secretCode == emailCode) {
      const newUser = await this.dbResetPassword({
        id: userId,
        password,
        emailVerified: true,
      });

      emailReset.user = newUser;
      emailReset.isVerified = true;
      this.publishVerificationCompleteEvent(emailReset);
      this.deleteEmailResetFromEntityCache(userId);
      return emailReset;
    } else {
      throw new ForbiddenError(
        "errMsg_UserEmailCodeIsNotAuthorized",
        ErrorCodes.CodeMismatch,
      );
    }
  }
}

const startPasswordResetByEmail = async (req, res, next) => {
  try {
    const passwordReset = new PasswordResetByEmail(req);
    const response = await passwordReset.startPasswordResetByEmail();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

const completePasswordResetByEmail = async (req, res, next) => {
  try {
    const passwordReset = new PasswordResetByEmail(req);
    const response = await passwordReset.completePasswordReset();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startPasswordResetByEmail,
  completePasswordResetByEmail,
  PasswordResetByEmail,
};
