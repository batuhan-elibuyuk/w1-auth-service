const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");

const { User } = require("models");
const { Op } = require("sequelize");
const { sequelize } = require("common");
const { hexaLogger } = require("common");

const { DBUpdateSequelizeCommand } = require("dbCommand");

const { UserQueryCacheInvalidator } = require("./query-cache-classes");

const { ElasticIndexer } = require("serviceCommon");
const getUserById = require("./utils/getUserById");

//not

class DbUpdateUserroleCommand extends DBUpdateSequelizeCommand {
  constructor(input) {
    const instanceMode = true;
    input.isBulk = false;
    input.updateEach = false;
    super(input, User, instanceMode);
    this.isBulk = false;
    this.commandName = "dbUpdateUserrole";
    this.nullResult = false;
    this.objectName = "user";
    this.serviceLabel = "w-auth-service";
    this.joinedCriteria = false;
    this.dbEvent = "w1-auth-service-dbevent-user-updated";
  }

  loadHookFunctions() {
    super.loadHookFunctions({});
  }

  initOwnership(input) {
    super.initOwnership(input);
  }

  async transposeResult() {
    // transpose dbData
  }

  async createQueryCacheInvalidator() {
    this.queryCacheInvalidator = new UserQueryCacheInvalidator();
  }

  createEntityCacher() {
    super.createEntityCacher();
  }

  async indexDataToElastic() {
    const elasticIndexer = new ElasticIndexer(
      "user",
      this.session,
      this.requestId,
    );
    const dbData = await getUserById(this.dbData.id);
    await elasticIndexer.indexData(dbData);
  }

  async setCalculatedFieldsAfterInstance(data) {
    const input = this.input;
  }

  buildIncludes(forWhereClause) {
    if (!this.input.getJoins) forWhereClause = true;
    const includes = [];
    return includes;
  }
}

const dbUpdateUserrole = async (input) => {
  input.id = input.userId;
  const dbUpdateCommand = new DbUpdateUserroleCommand(input);
  return await dbUpdateCommand.execute();
};

module.exports = dbUpdateUserrole;
