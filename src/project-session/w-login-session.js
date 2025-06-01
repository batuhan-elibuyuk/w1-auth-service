const { User } = require("models");
const { createHexCode } = require("common");
const { hexaLogger, setRedisData, getRedisData } = require("common");
const { hashCompare, hashString } = require("common");
const path = require("path");
const fs = require("fs");

const {
  HttpServerError,
  ForbiddenError,
  NotAuthenticatedError,
  ErrorCodes,
} = require("common");

const { Op } = require("sequelize");

const { getUserByQuery, createUser, updateUserById } = require("dbLayer");

const WSession = require("./w-session");

class WLoginSession extends WSession {
  async #getUserFromDb(userField, userValue) {
    const where = {
      [Op.and]: [
        { [userField]: { [Op.eq]: userValue } },

        { isActive: { [Op.eq]: true } },
      ],
    };
    console.log("where", where);
    const user = await getUserByQuery(where);

    //check if the user is a root user and owner of this tenant

    return user;
  }

  async #getUserWithUsernamePassword(email, password) {
    console.log("check user with email", email);
    const user = await this.#getUserFromDb("email", email);

    if (!user) {
      throw new NotAuthenticatedError(
        "errMsg_UserNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    const userPassword = user.password;

    if (!(hashCompare(password, userPassword) == true)) {
      throw new ForbiddenError(
        "errMsg_PasswordDoesntMatch",
        ErrorCodes.WrongPassword,
      );
    }

    return user;
  }

  async #getUserWithSsoSubject(userField, ssoSubject) {
    const user = await this.#getUserFromDb(userField, ssoSubject);
    if (!user) {
      throw new NotAuthenticatedError(
        "errMsg_UserNotFound",
        ErrorCodes.UserNotFound,
      );
    }
    return user;
  }

  async loginUser(byPassword, bySubject) {
    const session = {};
    let user = null;
    if (byPassword) {
      user = await this.#getUserWithUsernamePassword(
        byPassword.username,
        byPassword.password,
      );
    } else if (bySubject) {
      user = await this.#getUserWithSsoSubject(
        bySubject.userField,
        bySubject.subjectClaim,
      );
    }

    if (!user) return null;

    if (bySubject && bySubject.userField == "email") {
      // since email comes from social login, it can be considered as verified
      user.emailVerified = true;
    }

    if (user.emailVerified !== true) {
      throw new ForbiddenError(
        "errMsg_EmailNotVerified",
        ErrorCodes.EmailVerificationNeeded,
      );
    }

    if (user.id === this.superAdminId) user.isAbsolute = true;
    session.isAbsolute = user.isAbsolute;

    session.id = byPassword
      ? createHexCode()
      : (bySubject?.sessionId ?? createHexCode());
    session.sessionId = session.id;
    session.hexaId = createHexCode();

    for (const key of Object.keys(user)) {
      if (key !== "id") session[key] = user[key];
    }

    session.userId = user.id;
    session._USERID = user.id;

    return session;
  }

  async verifySessionToken(req, res, next) {
    try {
      if (this.session) {
        console.log("Session is already created", this.session.sessionId);
      }
      await this.readTenantIdFromRequest(req);
      await this.buildSessionFromRequest(req);
      if (this.session && (req.userAuthUpdate || this.session.userAuthUpdate)) {
        console.log("w session found but a relogin is requested");
        try {
          const userField = "id";
          const subjectClaim = this.session.userId;
          await this.setLoginToRequest(req, null, { userField, subjectClaim });
          await this.setServiceSession(req);
          res.set(this.tokenName, this.accessToken);
          res.cookie(this.tokenName, this.accessToken, {
            httpOnly: true,
            domain: process.env.COOKIE_URL,
          });
        } catch (err) {
          console.log(err);
          return next(
            new HttpServerError(
              "errMsg_CantReLoginAfterUserAuthConfigUpdate",
              err,
            ),
          );
        }
      }
      next();
    } catch (err) {
      next(new HttpServerError(err.message, err));
    }
  }

  async setLoginToRequest(req, byPassword, bySubject) {
    const username = byPassword ? byPassword.username : bySubject.subjectClaim;
    const session = await this.loginUser(byPassword, bySubject);

    session._USERID = session.userId;

    session.checkTokenMark = "w1-inapp-token";
    session._USERID = session.userId;
    session.userBucketToken = await this.createBucketToken(session);
    await this.setSessionToEntityCache(session);

    req.session = session;
    const token = await this.createTokenFromSession(session, false);
    if (!token) {
      throw new HttpServerError("errMsg_LoginTokenCanNotBeCreated", {
        detail: "JWTLib couldnt create token",
      });
    }
    session.accessToken = token;
    this.session = req.session;
    this.sessionId = req.sessionId;
    req.auth = this;
    this.accessToken = token;
    this.tokenLocation = "cookie";

    const cookieName = `w1-access-token`;

    this.tokenName = cookieName;
  }

  async getLoginPage(req, res, next) {
    const filePath = path.join(__dirname, "login.html");
    let html = fs.readFileSync(filePath, "utf8");
    res.status(200).send(html);
  }

  async loginBySocialAccount(accountInfo, req, res, next) {
    console.log("loginBySocialAccount", accountInfo);
    const userField = accountInfo.userField;
    const subjectClaim = accountInfo[userField];

    if (!userField || !subjectClaim) {
      return next(
        new NotAuthenticatedError(
          "errMsg_UserCanNotLoginWithoutCredentials",
          ErrorCodes.UserLoginWithoutCredentials,
        ),
      );
    }

    // check if user exists in db
    const user = await this.#getUserFromDb(userField, subjectClaim);

    if (!user && accountInfo.allowRegister) {
      await setRedisData(
        accountInfo.socialCode,
        JSON.stringify(accountInfo),
        60 * 3,
      ); // store for 3 minutes
      res.status(200).send({
        type: "RegisterNeededForSocialLogin",
        message: "User not found, but registration is allowed.",
        socialCode: accountInfo.socialCode,
        accountInfo: accountInfo,
      });
      return;
    }

    try {
      await this.setLoginToRequest(req, null, { userField, subjectClaim });
      res.set(this.tokenName, this.accessToken);
      console.log("Session is created", this.session);
      res
        .cookie(this.tokenName, this.accessToken, {
          httpOnly: true,
          domain: process.env.COOKIE_URL,
        })
        .status(200)
        .send(this.session);
    } catch (err) {
      next(err);
    }
  }

  async loginUserController(req, res, next) {
    console.log("loginUserController", req.body);
    const username = req.body.username;
    const password = req.body.password;

    if (!username && !password) {
      return next(
        new NotAuthenticatedError(
          "errMsg_UserCanNotLoginWithoutCredentials",
          ErrorCodes.UserLoginWithoutCredentials,
        ),
      );
    }

    try {
      await this.setLoginToRequest(req, { username, password }, null);
      res.set(this.tokenName, this.accessToken);
      console.log("Session is created", this.session);
      res
        .cookie(this.tokenName, this.accessToken, {
          httpOnly: true,
          domain: process.env.COOKIE_URL,
        })
        .status(200)
        .send(this.session);
    } catch (err) {
      next(err);
    }
  }

  async logoutUserController(req, res, next) {
    console.log("logoutUserController", req.session?.userId);
    try {
      try {
        if (req.session) {
          // delete the session from redis
          console.log("deleting session from redis", req.session.sessionId);
          await this.deleteSessionFromEntityCache(req.session.sessionId);
        }
      } catch (err) {
        console.log("Error while deleting session from redis", err.message);
      }

      // set cookie to be deleted
      if (req.auth?.currentCookieName) {
        console.log("deleting cookie...", req.auth.currentCookieName);
        res.clearCookie(req.auth.currentCookieName, {
          httpOnly: true,
          domain: process.env.COOKIE_URL,
        });
      }
    } catch (err) {
      console.log("Error while logging out", err.message);
    }
    res.status(200).send("LOGOUT OK");
  }

  async init() {
    await this.initSuperAdmin();
    await this.initUserManager();
  }

  async initSuperAdmin() {
    const absUserData = {
      id: this.superAdminId,
      fullname: "Root User",
      email: "admin@aadmin.com",
      emailVerified: true,

      password: hashString("superadmin"),
    };

    const { createUser, getUserById } = require("dbLayer");
    const absUser = await getUserById(absUserData.id);
    if (!absUser) {
      await createUser(absUserData);
    } else {
      delete absUserData.id;
      await updateUserById(this.superAdminId, absUserData);
    }
  }

  async initUserManager() {
    const userManagerId = this.superAdminId.replaceAll("f", "b");
    const absUserData = {
      id: userManagerId,
      fullname: "User Manager",
      email: "user.manager@mindbrix.com",
      emailVerified: true,

      password: hashString("superadmin"),
    };

    const { createUser, getUserById } = require("dbLayer");
    const absUser = await getUserById(absUserData.id);
    if (!absUser) {
      await createUser(absUserData);
    } else {
      delete absUserData.id;
      await updateUserById(userManagerId, absUserData);
    }
  }

  async invalidateUserAuthInSession(userId) {
    const userKey = "hexasessionid:" + userId;
    const userAuthUpdateKey = "hexauserauthupdate:" + userId;
    const sessionId = await getRedisData(userKey);
    if (sessionId) {
      await setRedisData(userAuthUpdateKey, "true");
    }
  }
}

// Export the class
module.exports = WLoginSession;
