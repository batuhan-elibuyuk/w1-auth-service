const { HexaLogTypes, hexaLogger } = require("serviceCommon");

const { RegisterUserManager } = require("managers");

const RestController = require("../../RestController");

class RegisterUserRestController extends RestController {
  constructor(req, res, next) {
    super("registerUser", "registeruser", req, res, next);
    this.dataName = "user";
    this.crudType = "create";
    this.status = 201;
    this.httpMethod = "POST";
  }

  createApiManager() {
    return new RegisterUserManager(this._req, "rest");
  }
}

const registerUser = async (req, res, next) => {
  const registerUserRestController = new RegisterUserRestController(
    req,
    res,
    next,
  );
  await registerUserRestController.processRequest();
};

module.exports = registerUser;
