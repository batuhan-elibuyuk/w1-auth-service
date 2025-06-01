const { sequelize } = require("common");
const { Op } = require("sequelize");
const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");
const { hexaLogger } = require("common");

const { User } = require("models");

const { DBGetSequelizeCommand } = require("dbCommand");

class DbGetUserCommand extends DBGetSequelizeCommand {
  constructor(input) {
    super(input, User);
    this.commandName = "dbGetUser";
    this.nullResult = false;
    this.objectName = "user";
    this.serviceLabel = "w-auth-service";
  }

  loadHookFunctions() {
    super.loadHookFunctions({});
  }

  async getCqrsJoins(data) {
    if (User.getCqrsJoins) await User.getCqrsJoins(data);
  }

  initOwnership(input) {
    super.initOwnership(input);
  }

  async checkEntityOwnership(entity) {
    return true;
  }

  createEntityCacher() {
    super.createEntityCacher();
  }

  async transposeResult() {
    // transpose dbData
  }

  buildIncludes(forWhereClause) {
    if (!this.input.getJoins) forWhereClause = true;
    const includes = [];
    return includes;
  }
}

const dbGetUser = (input) => {
  input.id = input.userId;
  const dbGetCommand = new DbGetUserCommand(input);
  return dbGetCommand.execute();
};

module.exports = dbGetUser;
