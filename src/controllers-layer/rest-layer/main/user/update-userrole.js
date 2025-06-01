const { HexaLogTypes, hexaLogger } = require("serviceCommon");

const { UpdateUserroleManager } = require("managers");

const RestController = require("../../RestController");

class UpdateUserroleRestController extends RestController {
  constructor(req, res, next) {
    super("updateUserrole", "updateuserrole", req, res, next);
    this.dataName = "user";
    this.crudType = "update";
    this.status = 200;
    this.httpMethod = "PATCH";
  }

  createApiManager() {
    return new UpdateUserroleManager(this._req, "rest");
  }
}

const updateUserrole = async (req, res, next) => {
  const updateUserroleRestController = new UpdateUserroleRestController(
    req,
    res,
    next,
  );
  await updateUserroleRestController.processRequest();
};

module.exports = updateUserrole;
