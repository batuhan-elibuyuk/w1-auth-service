const { HexaLogTypes, hexaLogger } = require("serviceCommon");

const { GetUserManager } = require("managers");

const RestController = require("../../RestController");

class GetUserRestController extends RestController {
  constructor(req, res, next) {
    super("getUser", "getuser", req, res, next);
    this.dataName = "user";
    this.crudType = "get";
    this.status = 200;
    this.httpMethod = "GET";
  }

  createApiManager() {
    return new GetUserManager(this._req, "rest");
  }
}

const getUser = async (req, res, next) => {
  const getUserRestController = new GetUserRestController(req, res, next);
  await getUserRestController.processRequest();
};

module.exports = getUser;
