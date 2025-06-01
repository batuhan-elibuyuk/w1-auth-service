const { NotFoundError } = require("common");

const DbCommand = require("./db-command");

class DBDeleteCommand extends DbCommand {
  constructor(input, instanceMode) {
    super(input);
    this.dbInstance = null;
    this.instanceMode = instanceMode;
  }

  async buildDataClause(input) {
    // blank inherit
  }

  async syncJoins() {}

  async runDelete() {}

  async postCommand() {
    if (this.queryCacheInvalidator) {
      if (this.oldDbData) {
        this.queryCacheInvalidator.invalidateCache(this.oldDbData);
      } else {
        this.queryCacheInvalidator.invalidateAll();
      }
    }
    if (this.entityCacher) this.entityCacher.delEntityFromCache(this.input.id);
    await this.indexDataToElastic();
    this.syncJoins();
    return false;
  }

  async runDbCommand(resolve) {
    await super.runDbCommand();
    await this.runDelete();
  }
}

class DBDeleteMongooseCommand extends DBDeleteCommand {
  constructor(input, mongooseModel, instanceMode) {
    super(input, instanceMode);
    this.dbModel = mongooseModel;
  }
}

class DBSoftDeleteMongooseCommand extends DBDeleteMongooseCommand {
  constructor(input, mongooseModel, instanceMode) {
    super(input, mongooseModel, instanceMode);
  }

  async runDelete() {
    const dbDoc = await this.mongooseModel.findOneAndUpdate(
      this.whereClause,
      { isActive: false },
      { new: true },
    );
    if (!dbDoc) throw new NotFoundError("errMsg_RecordNotFoundToDelete");
    this.dbData = dbDoc.getData(false);
    this.input[this.objectName] = this.dbData;
  }
}

class DBHardDeleteMongooseCommand extends DBDeleteMongooseCommand {
  constructor(input, mongooseModel, instanceMode) {
    super(input, mongooseModel, instanceMode);
  }

  async runDelete() {
    const res = await this.dbModel.findOneAndDelete(this.whereClause);
    if (!res) throw new NotFoundError("errMsg_RecordNotFoundToDelete");
    this.dbData = { id: this.input.id };
    this.input[this.objectName] = this.dbData;
  }
}

class DBDeleteSequelizeCommand extends DBDeleteCommand {
  constructor(input, sequelizeeModel, instanceMode) {
    super(input, instanceMode);
    this.dbModel = sequelizeeModel;
  }
}

class DBSoftDeleteSequelizeCommand extends DBDeleteSequelizeCommand {
  constructor(input, sequelizeeModel, instanceMode) {
    super(input, sequelizeeModel, instanceMode);
  }

  async runDelete() {
    let dbDoc = null;
    let rows = null;
    [rows, [dbDoc]] = await this.dbModel.update(
      { isActive: false },
      {
        where: this.whereClause,
        returning: true,
      },
    );

    if (!dbDoc) throw new NotFoundError("errMsg_RecordNotFoundToDelete");
    this.dbData = dbDoc.getData();
    this.input[this.objectName] = this.dbData;
  }
}

class DBHardDeleteSequelizeCommand extends DBDeleteSequelizeCommand {
  constructor(input, sequelizeeModel, instanceMode) {
    super(input, sequelizeeModel, instanceMode);
  }

  async runDelete() {
    const res = await this.dbModel.destroy({ where: this.whereClause });
    if (!res) throw new NotFoundError("errMsg_RecordNotFoundToDelete");
    this.dbData = { id: this.input.id };
    this.input[this.objectName] = this.dbData;
  }
}

module.exports = {
  DBHardDeleteMongooseCommand,
  DBSoftDeleteMongooseCommand,
  DBSoftDeleteSequelizeCommand,
  DBHardDeleteSequelizeCommand,
};
