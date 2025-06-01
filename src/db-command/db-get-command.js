const {
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");

const DbCommand = require("./db-command");

class DBGetCommand extends DbCommand {
  constructor(input) {
    super(input);
    this.entityCacher = null;
  }
  async buildDataClause(input) {
    // blank inherit
  }

  async buildWhereClause(input) {
    await super.buildWhereClause(input);
  }

  async checkEntityOwnership(entity) {
    return true;
  }

  async preCommand() {
    if (!this.entityCacher || this.input.getJoins) return;
    let eData = await this.entityCacher.getEntityFromCache();

    if (eData) {
      const isOwner = await this.checkEntityOwnership(eData);
      if (!isOwner)
        throw new ForbiddenError(
          "errMsg_" + this.commandName + "CanBeAccessedByOwner",
        );

      const selectList = this.getSelectList();
      if (selectList && selectList.length) {
        eData = Object.fromEntries(
          Object.entries(eData).filter(([key]) => selectList.includes(key)),
        );
      }

      this.dbData = eData;
      this.input[this.objectName] = this.dbData;
      this.dbData._source = "ecache";
      return this.dbData;
    }
  }

  async postCommand() {
    if (this.dbData) this.dbData._source = "db";
  }

  async getCqrsJoins(data) {}

  filterJsonField(dbData) {}
}

class DBGetMongooseCommand extends DBGetCommand {
  constructor(input, dbModel) {
    super(input);
    this.dbModel = dbModel;
  }

  populateQuery(query) {
    return query;
  }

  async runDbCommand() {
    await super.runDbCommand();

    let mongooseQuery = this.dbModel.findOne(this.whereClause);
    mongooseQuery = this.populateQuery(mongooseQuery);

    const rowData = await mongooseQuery.exec();

    if (!rowData) {
      if (this.nullResult) return null;
      throw new NotFoundError("errMsg_RecordNotFound");
    }

    this.dbData = rowData.getData();
    this.input[this.objectName] = this.dbData;

    await this.filterJsonField(this.dbData);
  }
}

class DBGetSequelizeCommand extends DBGetCommand {
  constructor(input, dbModel) {
    super(input);
    this.dbModel = dbModel;
  }

  buildIncludes() {
    return [];
  }

  getSelectList() {
    return [];
  }

  async setRead(id) {
    return null;
  }

  async runDbCommand() {
    await super.runDbCommand();
    const options = { where: this.whereClause, include: this.buildIncludes() };
    const selectList = this.getSelectList();
    if (selectList && selectList.length) {
      options.attributes = selectList;
    }
    options.limit = null;

    console.log("options", options);
    let rowData = await this.dbModel.findOne(options);
    if (Array.isArray(rowData)) rowData = rowData[0];

    if (!rowData) {
      if (this.nullResult) return null;
      throw new NotFoundError("errMsg_RecordNotFound");
    }

    this.dbData = rowData.getData();
    this.input[this.objectName] = this.dbData;
    await this.setRead(this.dbData.id);

    if (this.input.getJoins && !this.input.excludeCqrs) {
      await this.getCqrsJoins(this.dbData);
    }

    await this.filterJsonField(this.dbData);
  }
}

module.exports = { DBGetMongooseCommand, DBGetSequelizeCommand };
