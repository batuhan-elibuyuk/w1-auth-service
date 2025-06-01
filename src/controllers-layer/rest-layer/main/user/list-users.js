const { HexaLogTypes, hexaLogger } = require("serviceCommon");

const { ListUsersManager } = require("managers");

const RestController = require("../../RestController");

class ListUsersRestController extends RestController {
  constructor(req, res, next) {
    super("listUsers", "listusers", req, res, next);
    this.dataName = "users";
    this.crudType = "getList";
    this.status = 200;
    this.httpMethod = "GET";
  }

  createApiManager() {
    return new ListUsersManager(this._req, "rest");
  }
}

const listUsers = async (req, res, next) => {
  const listUsersRestController = new ListUsersRestController(req, res, next);
  await listUsersRestController.processRequest();
};

module.exports = listUsers;
