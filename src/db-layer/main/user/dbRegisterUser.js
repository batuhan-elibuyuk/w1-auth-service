const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");

const { User } = require("models");
const { Op } = require("sequelize");
const { hexaLogger } = require("common");

const { DBCreateSequelizeCommand } = require("dbCommand");

const { UserQueryCacheInvalidator } = require("./query-cache-classes");

const { ElasticIndexer } = require("serviceCommon");
const getUserById = require("./utils/getUserById");

const { hashString } = require("common");

class DbRegisterUserCommand extends DBCreateSequelizeCommand {
  constructor(input) {
    super(input);
    this.commandName = "dbRegisterUser";
    this.objectName = "user";
    this.serviceLabel = "w-auth-service";
    this.dbEvent = "w1-auth-service-dbevent-user-created";
  }

  loadHookFunctions() {
    super.loadHookFunctions({});
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

  async create_childs() {}

  async transposeResult() {
    // transpose dbData
  }

  async runDbCommand() {
    await super.runDbCommand();

    let user = null;
    let whereClause = {};
    let updated = false;
    let exists = false;
    try {
      if (!updated && this.dataClause.id && !exists) {
        user = user || (await User.findByPk(this.dataClause.id));
        if (user) {
          delete this.dataClause.id;
          this.dataClause.isActive = true;
          await user.update(this.dataClause);
          updated = true;
        }
      }
    } catch (error) {
      const eDetail = {
        whereClause: this.normalizeSequalizeOps(whereClause),
        dataClause: this.dataClause,
        errorStack: error.stack,
        checkoutResult: this.input.checkoutResult,
      };
      throw new HttpServerError(
        "Error in checking unique index when creating User",
        eDetail,
      );
    }

    if (!updated && !exists) {
      user = await User.create(this.dataClause);
    }

    this.dbData = user.getData();
    this.input.user = this.dbData;
    await this.create_childs();
  }
}

const dbRegisterUser = async (input) => {
  const dbCreateCommand = new DbRegisterUserCommand(input);
  return await dbCreateCommand.execute();
};

module.exports = dbRegisterUser;
