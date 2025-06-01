const { NotFoundError, BadRequestError } = require("common");

const DbCommand = require("./db-command");

const { sequelize } = require("common");

const { ServicePublisher } = require("serviceCommon");

const { Op } = require("sequelize");

class DBUpdateCommand extends DbCommand {
  constructor(input, instanceMode) {
    super(input);
    this.dbInstance = null;
    this.instanceMode = instanceMode;
    this.oldDbData = null;
    this.isBulk = input.isBulk;
    this.updateEach = input.updateEach;
    this.affectedRows = [];
  }

  async buildDataClause(input) {
    await super.buildDataClause(input);
    // remove null properties in update

    for (const key of Object.keys(this.dataClause)) {
      if (this.dataClause[key] == null) {
        delete this.dataClause[key];
      }
    }
  }

  async setCalculatedFieldsAfterInstance(data) {}

  async runUpdate() {
    return false;
  }

  async getDataClauseForEachItem(item) {
    return null;
  }

  async runSingleCommand() {
    await this.runUpdate();
    this.input.oldDataValues = this.getOldDataValues();
    this.input.newDataValues = this.getNewDataValues();
    this.affectedRows = [this.dbData.id];
    await this.sync_childs();
  }

  async runBulkCommand() {
    this.input["old_" + this.objectName] = {
      message: "not provided in bulk mode",
    };
    await this.runUpdate();
    this.input.oldDataValues = { message: "not provided in bulk mode" };
    this.input.newDataValues = { message: "not provided in bulk mode" };
  }

  async runDbCommand() {
    await super.runDbCommand();
    if (this.isBulk) await this.runBulkCommand();
    else await this.runSingleCommand();
  }

  async sync_childs() {
    return false;
  }

  async postCommand() {
    if (this.queryCacheInvalidator && !this.isBulk) {
      if (this.oldDbData) {
        this.queryCacheInvalidator.invalidateCache(this.dbData);
        this.queryCacheInvalidator.invalidateCache(this.oldDbData);
      } else {
        this.queryCacheInvalidator.invalidateAll();
      }
    }
    if (this.entityCacher && !this.isBulk)
      await this.entityCacher.saveEntityToCache(this.dbData);
    await this.indexDataToElastic();
  }

  async getEventPayload() {
    if (this.isBulk) {
      const whereClause = this.normalizeSequalizeOps(this.whereClause);
      return {
        affectedRows: this.dbData.affectedRows,
        whereClause: whereClause,
        dataClause: this.dataClause,
      };
    } else {
      return {
        [`old_${this.objectName}`]: this.oldDbData,
        [this.objectName]: this.dbData,
        oldDataValues: this.getOldDataValues(),
        newDataValues: this.getNewDataValues(),
      };
    }
  }

  async raiseDbEvent() {
    if (this.dbEvent && !this.emptyUpdate) {
      try {
        const _publisher = new ServicePublisher(
          this.dbEvent,
          await this.getEventPayload(),
          this.session,
          this.requestId,
        );
        await p_ublisher.publish();
      } catch (err) {
        console.log("DbEvent cant be published", this.dbEvent, err);
      }
    }
  }

  getOldDataValues() {
    const values = {};
    for (const propName of Object.keys(this.dataClause ?? {})) {
      values[propName] = this.oldDbData ? this.oldDbData[propName] : undefined;
    }
    return values;
  }
  getNewDataValues() {
    const values = {};
    for (const propName of Object.keys(this.dataClause ?? {})) {
      values[propName] = this.dbData ? this.dbData[propName] : undefined;
    }
    return values;
  }
}

class DBUpdateMongooseCommand extends DBUpdateCommand {
  constructor(input, mongooseModel, instanceMode) {
    super(input, instanceMode);
    this.dbModel = mongooseModel;
  }

  async runUpdate() {
    if (!this.isBulk) {
      let dbDoc = await this.dbModel.findOneAndUpdate(
        this.whereClause,
        this.dataClause,
        { new: true },
      );
      if (!dbDoc) throw new NotFoundError("errMsg_RecordNotFoundToUpdate");
      this.dbData = dbDoc.getData();
      this.input[this.objectName] = this.dbData;
    } else {
      this.dbData = { affectedRows: [] };
    }
  }
}

class DBUpdateSequelizeCommand extends DBUpdateCommand {
  constructor(input, sequelizeModel, instanceMode) {
    super(input, instanceMode);
    this.dbModel = sequelizeModel;
  }

  async runUpdate() {
    let dbDoc = null;
    let itemList = [];
    let whereClause = this.whereClause;

    if (this.joinedCriteria || this.isBulk) {
      const options = {
        raw: true,
        subQuery: false,
        where: this.whereClause,
        include: this.buildIncludes(true),
        attributes: [
          [sequelize.literal(`DISTINCT("${this.objectName}".id)`), "_id"],
        ],
      };
      let idList = await this.dbModel.findAll(options);
      idList = idList.map((id) => id._id);
      // hook_AfterIdList
      await this._afterIdListInBulkUpdate(idList);
      whereClause = { id: { [Op.in]: idList } };
    }
    if (this.isBulk && this.updateEach) {
      const dataList = await this.dbModel.findAll({ where: whereClause });
      itemList = dataList ? dataList.map((data) => data.getData()) : [];
      // hook_AfterItemList
      await this._afterItemListInBulkUpdate(itemList);
    }

    this.emptyUpdate = !this.dataClause || !Object.keys(this.dataClause).length;

    if (this.emptyUpdate && !(this.isBulk && this.updateEach)) {
      // empty update can ne used only in single update mode and updateEachMode with itemClause
      dbDoc = await this.dbModel.findOne({ where: whereClause });
      if (Array.isArray(dbDoc)) dbDoc = dbDoc[0];
      this.dbData = dbDoc ? dbDoc.getData() : null;
    } else if (this.emptyUpdate) {
      // empty update can ne used only in single update mode and updateEachMode with itemClause
      throw new BadRequestError(
        "errMsg_emptyUpdateClauseIsNotAllowedInBulkMode",
      );
    }

    if (this.isBulk && !this.updateEach) {
      await this._updateBulkAll(whereClause);
    } else if (this.isBulk && this.updateEach) {
      if (this.silentEachUpdate) {
        await this._updateSilentEachAll(itemList);
      } else {
        await this._updateEachAll(itemList);
      }
    } else {
      await this._updateSingle(whereClause);
    }

    if (!this.dbData) throw new NotFoundError("errMsg_RecordNotFoundToUpdate");
    this.input[this.objectName] = this.dbData;
  }

  async _updateEachAll(itemList) {
    this.affectedRows = [];
    const promises = [];
    for (const item of itemList) {
      promises.push(this.updateBulkItem(item));
    }
    const results = await Promise.all(promises);
    this.affectedRows = results.filter((data) => data).map((data) => data.id);
    this.dbData = { affectedRows: this.affectedRows };
  }

  async _updateSilentEachAll(itemList) {
    this.affectedRows = [];
    const promises = [];
    for (const item of itemList) {
      promises.push(this._updateSilentEachBulkItem(item));
    }
    const results = await Promise.all(promises);
    this.affectedRows = results.filter((id) => id);
    this.dbData = { affectedRows: this.affectedRows };
  }

  async _updateSilentEachBulkItem(item) {
    const itemClause = await this.getDataClauseForEachItem(item);
    [rowsCount, [dbDoc]] = await this.dbModel.update(itemClause, {
      where: { id: item.id },
      returning: true,
    });
    if (dbDoc) return dbDoc.id;
    return null;
  }

  async _updateBulkAll(whereClause) {
    let rowsCount = null;
    let rows = null;
    [rowsCount, rows] = await this.dbModel.update(this.dataClause, {
      where: whereClause,
      returning: true,
    });
    this.affectedRows = rows ? rows.map((row) => row.id) : [];
    this.dbData = { affectedRows: this.affectedRows };
  }

  async _updateSingle(whereClause) {
    let rowsCount = null;
    let dbDoc = null;
    [rowsCount, [dbDoc]] = await this.dbModel.update(this.dataClause, {
      where: whereClause,
      returning: true,
    });
    this.dbData = dbDoc ? dbDoc.getData() : null;
  }

  async _afterItemListInBulkUpdate(itemlist) {}

  async _afterIdListInBulkUpdate(itemlist) {}

  buildIncludes() {
    return [];
  }
}

module.exports = { DBUpdateMongooseCommand, DBUpdateSequelizeCommand };
