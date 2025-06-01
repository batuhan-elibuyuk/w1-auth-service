const VerificationServiceBase = require("./verification-service-base");

const {
  BadRequestError,
  ErrorCodes,
  NotAuthenticatedError,
  ForbiddenError,
} = require("common");

class MobileVerification extends VerificationServiceBase {
  constructor(req) {
    super(req, "byLink");
    this.startTopic = "w1-user-service-mobile-verification-start";
    this.completeTopic = "w1-user-service-mobile-verification-complete";
  }

  async getMobileVerificationEntityCache(userId) {
    return this.getVStepFromEntityCache("mobileVerification", userId);
  }

  async setMobileVerificationEntityCache(mobileVerification) {
    return this.setVStepToEntityCache(
      "mobileVerification",
      mobileVerification.userId,
      mobileVerification,
    );
  }

  async deleteMobileVerificationEntityCache(userId) {
    return this.deleteVStepFromEntityCache("mobileVerification", userId);
  }

  async startVerification() {
    console.log("startVerification Mobile", this.req.body);
    const email = this.req.body.email;

    const user = await this.findUserByEmail(email);

    if (user.mobileVerified) {
      throw new BadRequestError(
        "errMsg_UserMobileAlreadyVerified",
        ErrorCodes.MobileAlreadyVerified,
      );
    }

    const mobileVerificationDate = new Date();
    const mobileVerificationTimeStamp = mobileVerificationDate.getTime();

    const mobileVerification = (await this.getMobileVerificationEntityCache(
      user.id,
    )) ?? {
      userId: user.id,
      mobile: user.mobile,
    };

    const delta =
      mobileVerificationTimeStamp - mobileVerification.timeStamp ??
      mobileVerificationTimeStamp;

    if (delta < 60 * 1000) {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeCanBeSentOnceInTheTimeWindow",
        ErrorCodes.CodeSpamError,
      );
    }

    let codeIndex = mobileVerification.codeIndex ?? 0;
    ++codeIndex;
    if (codeIndex > 10) codeIndex = 1;

    mobileVerification.secretCode = this.createSecretCode();
    mobileVerification.timeStamp = mobileVerificationTimeStamp;
    mobileVerification.date = mobileVerificationDate;
    mobileVerification.codeIndex = codeIndex;
    mobileVerification.expireTime = Number(86400);
    mobileVerification.verificationType = this.verificationType;

    this.setMobileVerificationEntityCache(mobileVerification);
    mobileVerification.user = user;
    this.publishVerificationStartEvent(mobileVerification);
    return mobileVerification;
  }

  async completeVerification() {
    const userId = this.req.body.userId;
    const user = await this.findUserById(userId);

    if (user.mobileVerified) {
      throw new BadRequestError(
        "errMsg_UserMobileAlreadyVerified",
        ErrorCodes.MobileAlreadyVerified,
      );
    }

    const mobileVerification =
      await this.getMobileVerificationEntityCache(userId);

    if (!mobileVerification) {
      throw new NotAuthenticatedError(
        "errMsg_UserMobileCodeIsNotFoundInStore",
        ErrorCodes.StepNotFound,
      );
    }

    const mobileVerificationTimeStamp = new Date();
    const delta =
      mobileVerificationTimeStamp - mobileVerification.timeStamp ??
      mobileVerificationTimeStamp;

    if (delta > Number(86400) * 1000) {
      throw new NotAuthenticatedError(
        "errMsg_UserMobileCodeHasExpired",
        ErrorCodes.CodeExpired,
      );
    }

    if (mobileVerification.secretCode == this.req.body.secretCode) {
      const newUser = await this.dbVerifyMobile(userId);
      mobileVerification.user = newUser;
      mobileVerification.isVerified = true;
      this.publishVerificationCompleteEvent(mobileVerification);
      return mobileVerification;
    } else {
      throw new ForbiddenError(
        "errMsg_UserMobileCodeIsNotAuthorized",
        ErrorCodes.CodeMismatch,
      );
    }
  }
}

const startMobileVerification = async (req, res, next) => {
  try {
    const mobileVerification = new MobileVerification(req);
    const response = await mobileVerification.startVerification();
    console.log("start mobile verification", response);
    res.send(response);
  } catch (err) {
    next(err);
  }
};

const completeMobileVerification = async (req, res, next) => {
  try {
    const mobileVerification = new MobileVerification(req);
    const response = await mobileVerification.completeVerification();
    res.send(response);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startMobileVerification,
  completeMobileVerification,
  MobileVerification,
};
