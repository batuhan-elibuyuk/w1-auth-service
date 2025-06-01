const { HexaLogTypes, hexaLogger } = require("serviceCommon");

const { UpdatePasswordManager } = require("managers");

const RestController = require("../../RestController");

class UpdatePasswordRestController extends RestController {
  constructor(req, res, next) {
    super("updatePassword", "updatepassword", req, res, next);
    this.dataName = "user";
    this.crudType = "update";
    this.status = 200;
    this.httpMethod = "PATCH";
  }

  createApiManager() {
    return new UpdatePasswordManager(this._req, "rest");
  }
}

const updatePassword = async (req, res, next) => {
  const updatePasswordRestController = new UpdatePasswordRestController(
    req,
    res,
    next,
  );
  await updatePasswordRestController.processRequest();
};

module.exports = updatePassword;
