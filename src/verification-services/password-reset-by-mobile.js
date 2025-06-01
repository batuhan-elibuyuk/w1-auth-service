const VerificationServiceBase = require("./verification-service-base");

const {
  ForbiddenError,
  NotAuthenticatedError,
  BadRequestError,
  ErrorCodes,
  NotFoundError,
} = require("common");

class PasswordResetByMobile extends VerificationServiceBase {
  constructor(req) {
    super(req, "byLink");
    this.startTopic = "w1-user-service-password-reset-by-mobile-start";
    this.completeTopic = "w1-user-service-password-reset-by-mobile-complete";
  }

  async getMobileResetFromEntityCache(userId) {
    return this.getVStepFromEntityCache("mobileReset", userId);
  }

  async setMobileResetToEntityCache(mobileReset) {
    return this.setVStepToEntityCache(
      "mobileReset",
      mobileReset.userId,
      mobileReset,
    );
  }

  async deleteMobileResetFromEntityCache(userId) {
    return this.deleteVStepFromEntityCache("mobileReset", userId);
  }

  async startPasswordReset() {
    const mobile = this.req.body.mobile;
    const user = await this.findUserByMobile(mobile);

    if (!user) {
      throw new NotFoundError(
        "errMsg_UserMobileNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    const userId = user.id;

    const mobileResetDate = new Date();
    const mobileResetTimeStamp = mobileResetDate.getTime();

    const mobileReset = (await this.getMobileResetFromEntityCache(userId)) ?? {
      userId: userId,
      mobile: user.mobile,
    };

    const delta =
      mobileResetTimeStamp - mobileReset.timeStamp ?? mobileResetTimeStamp;

    if (delta < 60 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeCanBeSentOnceInTheTimeWindow",
        ErrorCodes.CodeSpamError,
      );
    }

    let codeIndex = mobileReset.codeIndex ?? 0;
    ++codeIndex;
    if (codeIndex > 10) codeIndex = 1;

    mobileReset.secretCode = this.createSecretCode();
    mobileReset.timeStamp = mobileResetTimeStamp;
    mobileReset.date = mobileResetDate;
    mobileReset.codeIndex = codeIndex;
    mobileReset.expireTime = Number(86400);
    mobileReset.verificationType = this.verificationType;

    await this.setMobileResetToEntityCache(mobileReset);

    mobileReset.user = user;
    this.publishVerificationStartEvent(mobileReset);

    return mobileReset;
  }

  async completePasswordReset() {
    const password = this.req.body.password;
    const mobileCode = this.req.body.secretCode;
    const email = this.req.body.email;

    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new NotAuthenticatedError(
        "errMsg_UserMobileNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    const userId = user.id;
    const mobileReset = await this.getMobileResetFromEntityCache(userId);

    if (!mobileReset) {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeIsNotFoundInStore",
        ErrorCodes.StepNotFound,
      );
    }

    const mobileResetTimeStamp = new Date();

    const delta =
      mobileResetTimeStamp - mobileReset.timeStamp ?? mobileResetTimeStamp;

    if (delta > 86400 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeHasExpired",
        ErrorCodes.CodeExpired,
      );
    }

    if (mobileReset.secretCode == mobileCode) {
      const newUser = await this.dbResetPassword({
        id: userId,
        password,
        mobileVerified: true,
      });

      await this.deleteMobileResetFromEntityCache(userId);
      mobileReset.user = newUser;
      mobileReset.isVerified = true;
      this.publishVerificationCompleteEvent(mobileReset);
      return mobileReset;
    } else {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeIsNotAuthorized",
        ErrorCodes.CodeMismatch,
      );
    }
  }
}

const startPasswordResetByMobile = async (req, res, next) => {
  try {
    const passwordReset = new PasswordResetByMobile(req);
    const response = await passwordReset.startPasswordReset();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

const completePasswordResetByMobile = async (req, res, next) => {
  try {
    const passwordReset = new PasswordResetByMobile(req);
    const response = await passwordReset.completePasswordReset();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startPasswordResetByMobile,
  completePasswordResetByMobile,
  PasswordResetByMobile,
};
