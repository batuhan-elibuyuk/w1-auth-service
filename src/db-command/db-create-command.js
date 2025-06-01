const DbCommand = require("./db-command");

class DBCreateCommand extends DbCommand {
  constructor(input) {
    super(input);
    //if (this.hook.testFunctionsModule) {
    //this.runHookFunctions("testFunctionsModule", this.hook.testFunctionsModule, []);
    //}
  }
  async buildWhereClause(input) {
    // blank inherit
  }

  async create_childs() {
    // will be overridden if child references are created from main input
  }

  async afterInstance() {}

  async postCommand() {
    if (this.queryCacheInvalidator)
      this.queryCacheInvalidator.invalidateCache(this.dbData);
    if (this.entityCacher)
      await this.entityCacher.saveEntityToCache(this.dbData);
    await this.indexDataToElastic();
    return false;
  }
}

class DBCreateMongooseCommand extends DBCreateCommand {
  constructor(input) {
    super(input);
  }
}

class DBCreateSequelizeCommand extends DBCreateCommand {
  constructor(input) {
    super(input);
  }
}

module.exports = { DBCreateMongooseCommand, DBCreateSequelizeCommand };
