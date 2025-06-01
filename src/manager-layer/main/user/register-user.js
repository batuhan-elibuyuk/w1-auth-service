const UserManager = require("./UserManager");
const { isValidObjectId, isValidUUID, PaymentGateError } = require("common");
const { hexaLogger } = require("common");
const { ElasticIndexer } = require("serviceCommon");
const { UserRegisterredPublisher } = require("../../route-events/publishers");

const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");
const { dbRegisterUser } = require("dbLayer");

const { getRedisData } = require("common");

class RegisterUserManager extends UserManager {
  constructor(request, controllerType) {
    super(request, {
      name: "registerUser",
      controllerType: controllerType,
      pagination: false,
      crudType: "create",
      loginRequired: false,
      hasShareToken: false,
    });

    this.dataName = "user";
  }

  parametersToJson(jsonObj) {
    super.parametersToJson(jsonObj);
    jsonObj.avatar = this.avatar;
    jsonObj.socialCode = this.socialCode;
    jsonObj.password = this.password;
    jsonObj.fullname = this.fullname;
    jsonObj.email = this.email;
  }

  readRestParameters(request) {
    this.avatar = request.body?.avatar;
    this.socialCode = request.body?.socialCode;
    this.password = request.body?.password;
    this.fullname = request.body?.fullname;
    this.email = request.body?.email;
    this.id = request.body?.id ?? request.query?.id ?? request.id;
    this.requestData = request.body;
    this.queryData = request.query ?? {};
    const url = request.url;
    this.urlPath = url.slice(1).split("/").join(".");
  }

  async readRedisParameters() {
    this.socialProfile = this.socialCode
      ? await getRedisData(this.socialCode)
      : undefined;
  }

  async transformParameters() {
    this.avatar =
      this.socialProfile?.avatar ??
      (this.avatar
        ? this.avatar
        : `https://gravatar.com/avatar/${LIB.common.md5(this.email)}?s=200&d=identicon`);
    this.password = this.socialProfile
      ? (this.password ?? LIB.common.randomCode())
      : this.password;
    this.fullname = this.socialProfile?.fullname ?? this.fullname;
    this.email = this.socialProfile?.email ?? this.email;
  }

  async setVariables() {}

  checkParameters() {
    if (this.password == null) {
      throw new BadRequestError("errMsg_passwordisRequired");
    }

    if (this.fullname == null) {
      throw new BadRequestError("errMsg_fullnameisRequired");
    }

    if (this.email == null) {
      throw new BadRequestError("errMsg_emailisRequired");
    }
  }

  setOwnership() {
    this.isOwner = false;
    if (!this.session || !this.session.userId) return;

    this.isOwner = this.user?.id === this.session.userId;
  }

  async doBusiness() {
    // Call DbFunction
    // make an awaited call to the dbRegisterUser function to create the user and return the result to the controller
    const user = await dbRegisterUser(this);

    return user;
  }

  async raiseEvent() {
    UserRegisterredPublisher.Publish(this.output, this.session).catch((err) => {
      console.log("Publisher Error in Rest Controller:", err);
    });
  }

  async getDataClause() {
    const { newUUID } = require("common");

    const { hashString } = require("common");

    if (this.id) this.userId = this.id;
    if (!this.userId) this.userId = newUUID(false);

    const dataClause = {
      id: this.userId,
      email: this.email,
      password: hashString(this.password),
      fullname: this.fullname,
      avatar: this.avatar,
      emailVerified: this.socialProfile?.emailVerified ?? false,
      roleId: this.socialProfile?.roleId ?? "user",
    };

    return dataClause;
  }
}

module.exports = RegisterUserManager;
