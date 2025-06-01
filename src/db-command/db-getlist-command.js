const DbCommand = require("./db-command");

class DBGetListCommand extends DbCommand {
  constructor(input) {
    super(input);
    this.queryCacher = null;
    this.paginationTotalRowCount = null;
  }
  async buildDataClause(input) {
    // blank inherit
  }

  createQueryCacher(input, whereClause) {
    this.queryCacher = null;
  }

  async buildWhereClause(input) {
    await super.buildWhereClause(input);
    this.createQueryCacher(input, this.whereClause);
  }

  async preCommand() {
    if (!this.queryCacher) return;
    const cacheData = await this.queryCacher.readQueryResult();
    this.input.cacheKey = this.queryCacher.queryKey;

    if (cacheData) {
      this.dbData = cacheData;
      this.input.dbData = this.dbData;
      this.dbData._source = "cache";
      this.dbData._cacheKey = this.queryCacher.queryKey;
      return this.dbData;
    }
  }

  async postCommand() {
    if (this.queryCacher) {
      this.queryCacher.writeQueryResult(
        this.dbData,
        this.input.cacheTTL ?? 500,
      );
      this.dbData._cacheKey = this.queryCacher.queryKey;
    }
    this.dbData._source = "db";
  }

  async setPaginationTotalRowCount() {
    this.paginationTotalRowCount = 0;
  }

  async prepareDbData(rowData) {
    if (this.input.pagination && this.paginationTotalRowCount == null)
      await this.setPaginationTotalRowCount();
    this.dbData.totalRowCount = this.input.pagination
      ? this.paginationTotalRowCount
      : Array.isArray(rowData)
        ? rowData.length
        : 1;

    this.dbData.pageCount = this.input.pagination
      ? Math.ceil(
          this.dbData.totalRowCount / this.input.pagination.pageRowCount,
        )
      : 1;
    this.dbData.items = Array.isArray(rowData)
      ? rowData.map((item) => item.getData())
      : rowData.getData();

    if (this.input.getJoins && !this.input.excludeCqrs) {
      await this.getCqrsJoins(this.dbData.items);
    }

    if (!Array.isArray(this.dbData.items)) {
      this.convertAggregationsToNumbers(this.dbData.items);
    } else {
      for (const item of this.dbData.items) {
        this.convertAggregationsToNumbers(item);
      }
    }
  }

  convertAggregationsToNumbers(item) {}

  async getCqrsJoins(item) {}
}

class DBGetListMongooseCommand extends DBGetListCommand {
  createQuery() {
    return null;
  }

  populateQuery(query) {
    return query;
  }

  paginateQuery(query) {
    if (this.input.pagination) {
      const limit = this.input.pagination.pageRowCount;
      const skip =
        this.input.pagination.pageRowCount *
        (this.input.pagination.pageNumber - 1);
      query = query.limit(limit).skip(skip);
    }
    return query;
  }

  async runDbCommand() {
    const cmResult = await super.runDbCommand();
    if (cmResult !== undefined) return cmResult;
    let mongooseQuery = this.createQuery();
    mongooseQuery = this.populateQuery(mongooseQuery);
    mongooseQuery = this.paginateQuery(mongooseQuery);

    const rowData = await mongooseQuery.exec();
    this.dbData = { items: [] };
    this.input[this.objectName] = [];
    if (!rowData) return this.dbData;
    await this.prepareDbData(rowData);
    this.input[this.objectName] = this.dbData.items;
  }
}

class DBGetListSequelizeCommand extends DBGetListCommand {
  async executeQuery() {
    return null;
  }

  getSelectList() {
    return [];
  }

  async runDbCommand() {
    const cmResult = await super.runDbCommand();
    if (cmResult !== undefined) return cmResult;

    const rowData = await this.executeQuery();

    this.dbData = { items: [] };
    this.input[this.objectName] = [];
    if (!rowData) return this.dbData;

    const rowDbData = this.input.pagination ? rowData.rows : rowData;
    this.paginationTotalRowCount = this.input.pagination
      ? rowData.count
      : rowData.length;

    await this.prepareDbData(rowDbData);
    this.input[this.objectName] = this.dbData.items;
  }
}

module.exports = { DBGetListMongooseCommand, DBGetListSequelizeCommand };
