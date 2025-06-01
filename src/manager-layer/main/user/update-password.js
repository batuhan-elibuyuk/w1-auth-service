const UserManager = require("./UserManager");
const { isValidObjectId, isValidUUID, PaymentGateError } = require("common");
const { hexaLogger } = require("common");
const { ElasticIndexer } = require("serviceCommon");
const { PasswordUpdatedPublisher } = require("../../route-events/publishers");

const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");
const { dbUpdatePassword } = require("dbLayer");

class UpdatePasswordManager extends UserManager {
  constructor(request, controllerType) {
    super(request, {
      name: "updatePassword",
      controllerType: controllerType,
      pagination: false,
      crudType: "update",
      loginRequired: true,
      hasShareToken: false,
    });

    this.dataName = "user";
  }

  parametersToJson(jsonObj) {
    super.parametersToJson(jsonObj);
    jsonObj.oldPassword = this.oldPassword;
    jsonObj.newPassword = this.newPassword;
    jsonObj.userId = this.userId;
  }

  readRestParameters(request) {
    this.oldPassword = request.body?.oldPassword;
    this.newPassword = request.body?.newPassword;
    this.userId = request.params?.userId;
    this.requestData = request.body;
    this.queryData = request.query ?? {};
    const url = request.url;
    this.urlPath = url.slice(1).split("/").join(".");
  }

  async transformParameters() {
    this.oldPassword = this.oldPassword
      ? this.hashString(this.oldPassword)
      : null;
    this.newPassword = this.newPassword
      ? this.hashString(this.newPassword)
      : null;
  }

  async setVariables() {}

  async fetchInstance() {
    const { getUserById } = require("dbLayer");
    this.user = await getUserById(this.userId);
    if (!this.user) {
      throw new NotFoundError("errMsg_RecordNotFound");
    }
  }

  checkParameters() {
    if (this.oldPassword == null) {
      throw new BadRequestError("errMsg_oldPasswordisRequired");
    }

    if (this.newPassword == null) {
      throw new BadRequestError("errMsg_newPasswordisRequired");
    }

    if (this.userId == null) {
      throw new BadRequestError("errMsg_userIdisRequired");
    }

    // ID
    if (
      this.userId &&
      !isValidObjectId(this.userId) &&
      !isValidUUID(this.userId)
    ) {
      throw new BadRequestError("errMsg_userIdisNotAValidID");
    }
  }

  setOwnership() {
    this.isOwner = false;
    if (!this.session || !this.session.userId) return;

    this.isOwner = this.user?.id === this.session.userId;
  }

  checkAbsolute() {
    // Check if user has an absolute role to ignore all authorization validations and return
    if (
      this.userHasRole(this.ROLES.superAdmin) ||
      this.userHasRole(this.ROLES.admin)
    ) {
      this.absoluteAuth = true;
      return true;
    }
    return false;
  }

  async checkLayer3AuthValidations() {
    // check ownership of the record agianst the session user
    if (!this.isOwner) {
      throw new ForbiddenError("errMsg_userCanBeAccessedByOwner");
    }

    //check "403" validations

    // Validation Check: oldPassword
    // Check if the current password mathces the old password. It is done after the instance is fetched.
    if (!this.hashCompare(this.user.password, this.oldPassword)) {
      throw new ForbiddenError("errMsg_TheOldPasswordDoesNotMatch");
    }
  }

  async doBusiness() {
    // Call DbFunction
    // make an awaited call to the dbUpdatePassword function to update the password and return the result to the controller
    const password = await dbUpdatePassword(this);

    return password;
  }

  async checkSessionInvalidates() {
    /*  
 await invalidateUserSessions(this.user.id);*/
  }

  async invalidateUserSessions(userId) {
    const userAuthUpdateKey = "hexauserauthupdate:" + userId;
    await setRedisData(userAuthUpdateKey, "true");
  }

  async raiseEvent() {
    PasswordUpdatedPublisher.Publish(this.output, this.session).catch((err) => {
      console.log("Publisher Error in Rest Controller:", err);
    });
  }

  async getRouteQuery() {
    return { $and: [{ id: this.userId }, { isActive: true }] };

    // handle permission filter later
  }

  async getWhereClause() {
    const { convertUserQueryToSequelizeQuery } = require("common");

    const routeQuery = await this.getRouteQuery();

    return convertUserQueryToSequelizeQuery(routeQuery);
  }

  async getDataClause() {
    const { hashString } = require("common");

    const dataClause = {
      // password parameter is closed to update in inputLayer
      // include it in dbLayer unless you are sure
      password: this.newPassword,
    };

    return dataClause;
  }
}

module.exports = UpdatePasswordManager;
