const { redisClient, getRedisData } = require("common");

const {
  ForbiddenError,
  NotAuthenticatedError,
  NotFoundError,
  BadRequestError,
  HttpServerError,
  ErrorCodes,
} = require("common");

const { v4 } = require("uuid");

const { User } = require("models");

const { ServicePublisher } = require("serviceCommon");

const VerificationType = {
  byLink: "byLink",
  byCode: "byCode",
};

class VerificationServiceBase {
  constructor(req, verificationType) {
    this.req = req ?? null;
    this.requestId = req?.requestId;
    this.session = req?.session;
    this.hexaAuth = this.req?.auth;
    this.verificationType = verificationType;
  }

  async findUserByEmail(email) {
    const user = await User.findOne({ where: { email, isActive: true } });

    if (!user) {
      throw new NotFoundError(
        "errMsg_UserWithGivenEmailNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    if (!user.isActive) {
      throw new NotFoundError(
        "errMsg_UserWithGivenEmailDeleted",
        ErrorCodes.UserDeleted,
      );
    }

    return user;
  }

  async findUserByMobile(mobile) {
    const user = await User.findOne({ where: { mobile, isActive: true } });

    if (!user) {
      throw new NotFoundError(
        "errMsg_UserWithGivenMobileNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    if (!user.isActive) {
      throw new NotFoundError(
        "errMsg_UserWithGivenMobileDeleted",
        ErrorCodes.UserDeleted,
      );
    }

    return user;
  }

  async dbVerifyEmail(userId) {
    const user = await this.findUserById(userId);

    if (user.emailVerified) {
      throw new BadRequestError(
        "errMsg_UserEmailAlreadyVerified",
        ErrorCodes.EmailAlreadyVerified,
      );
    }

    const resultUserData = await this.updateDb(userId, {
      emailVerified: true,
    });

    return resultUserData;
  }

  async dbVerifyMobile(userId) {
    const user = await this.findUserById(userId);

    if (user.mobileVerified) {
      throw new BadRequestError(
        "errMsg_UserMobileAlreadyVerified",
        ErrorCodes.MobileAlreadyVerified,
      );
    }

    const resultUserData = await this.updateDb(userId, {
      mobileVerified: true,
    });

    return resultUserData;
  }

  async updateDb(id, updateFields) {
    const [updatedRows] = await User.update(updateFields, {
      where: { id: id },
      returning: true,
    });
    if (updatedRows === 0) {
      throw new NotFoundError(
        "errMsg_FailedToUpdateUser",
        ErrorCodes.UserUpdateFailed,
      );
    }
    return updatedRows;
  }

  async findUserById(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError(
        "errMsg_UserWithGivenIdNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    if (!user.isActive) {
      throw new NotFoundError(
        "errMsg_UserWithGivenIdDeleted",
        ErrorCodes.UserDeleted,
      );
    }

    return user;
  }

  async hashPassword(password) {
    const bcrypt = require("bcryptjs");
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password, hashedPassword) {
    const bcrypt = require("bcryptjs");
    return await bcrypt.compare(password, hashedPassword);
  }

  async generateToken(user) {
    const jwt = require("jsonwebtoken");
    const secretKey = process.env.JWT_SECRET_KEY || "your_jwt_secret_key";
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      secretKey,
      { expiresIn: "1h" },
    );
    return token;
  }

  createHexCode = () => {
    const code = v4();
    return code.replace(/-/g, "");
  };

  createRandom6DigitCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code;
  };

  createSecretCode = () => {
    if (this.verificationType === VerificationType.byLink) {
      return this.createHexCode();
    } else if (this.verificationType === VerificationType.byCode) {
      return this.createRandom6DigitCode();
    }
    return this.createHexCode();
  };

  async getVStepFromEntityCache(vName, id) {
    const vStep = await getRedisData(vName + ":" + id);
    return vStep;
  }

  async setVStepToEntityCache(vName, id, vStep) {
    await this.setRedisData(vName + ":" + id, JSON.stringify(vStep));
  }

  async deleteVStepFromEntityCache(vName, id) {
    await this.deleteRedisData(vName + ":" + id);
  }

  async setRedisData(key, value) {
    return await redisClient.set(key, value);
  }

  async deleteRedisData(key) {
    return await redisClient.del(key);
  }

  async dbResetPassword(input) {
    const userId = input.id;
    const user = await this.findUserById(userId);

    delete input.id;
    input.recordVersion = ++user.recordVersion;

    let userData = await this.updateDb(userId, input);
    return userData;
  }

  async publishVerificationStartEvent(verificationData) {
    const verificationStartPublisher = new ServicePublisher(
      this.startTopic,
      verificationData,
      this.session,
      this.requestId,
    );
    verificationStartPublisher.publish();
  }

  async publishVerificationCompleteEvent(verificationData) {
    const verificationCompletePublisher = new ServicePublisher(
      this.completeTopic,
      verificationData,
      this.session,
      this.requestId,
    );
    verificationCompletePublisher.publish();
  }
}

module.exports = VerificationServiceBase;
