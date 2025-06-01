const { HexaLogTypes, hexaLogger } = require("serviceCommon");

const { UpdateUserManager } = require("managers");

const RestController = require("../../RestController");

class UpdateUserRestController extends RestController {
  constructor(req, res, next) {
    super("updateUser", "updateuser", req, res, next);
    this.dataName = "user";
    this.crudType = "update";
    this.status = 200;
    this.httpMethod = "PATCH";
  }

  createApiManager() {
    return new UpdateUserManager(this._req, "rest");
  }
}

const updateUser = async (req, res, next) => {
  const updateUserRestController = new UpdateUserRestController(req, res, next);
  await updateUserRestController.processRequest();
};

module.exports = updateUser;
