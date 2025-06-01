const { HttpError, HttpServerError } = require("common");
const { ServicePublisher } = require("serviceCommon");

const { Op } = require("sequelize");

class DbCommand {
  constructor(input, commandName) {
    this.input = input;
    if (this.input.ignoreElasticIndex) {
      if (!Array.isArray(this.input.ignoreElasticIndex))
        this.input.ignoreElasticIndex = [this.input.ignoreElasticIndex];
      this.input.ignoreElasticIndex = this.input.ignoreElasticIndex.map(
        (eIndex) => eIndex.toLowerCase(),
      );
    }
    this.session = input.session;
    this.requestId = input.requestId;
    this.auth = input.auth;
    this.commandName = commandName;
    this.whereClause = null;
    this.commandName = "DbCommand";
    this.dbData = null;
    this.entityCacher = null;
    this.queryCacheInvalidator = null;
    this.initOwnership(input);
    this.location = 0;
    this.loadHookFunctions({});
  }

  loadHookFunctions(hookConfig) {
    // will be called in child class with hook config object
    this.hook = {};
    try {
      this.hookIndex = require("hookFunctions");
    } catch (err) {
      console.log("Error in loading hook functions index", err);
      return;
    }

    for (const hookName of Object.keys(hookConfig)) {
      const hookList = hookConfig[hookName];
      this.hook[hookName] = [];
      for (const hookFunctionName of hookList) {
        try {
          const hookFunction = this.hookIndex[hookFunctionName];
          this.hook[hookName].push(hookFunction);
        } catch (err) {
          console.log("Error in loading a hook function", hookName, err);
        }
      }
    }
  }

  readFromContext(readParam) {
    return this.input[readParam];
  }

  readFromSession(readParam) {
    return this.session && this.session.hasOwnProperty(readParam)
      ? this.session[readParam]
      : null;
  }

  initOwnership(input) {
    this.checkOwner = false;
  }

  async runPreHooks() {}

  async runPostHooks() {}

  async runMainHook() {}

  async buildWhereClause(input) {
    this.whereClause = await input.getWhereClause();
    // hook_AfterWhereClause
    this.whereClause = await this._afterWhereClause(
      this.input,
      this.whereClause,
    );
  }

  async _afterWhereClause(input, whereClause) {
    return whereClause;
  }

  async _afterDataClause(input, dataClause) {
    return dataClause;
  }

  normalizeSequalizeOps(seqObj) {
    if (typeof seqObj !== "object") return seqObj;
    if (!seqObj) return null;
    const keys = Object.keys(seqObj);
    const symbolKeys = Object.getOwnPropertySymbols(seqObj);
    const newObj = {};
    for (const key of keys) {
      seqObj[key] = this.normalizeSequalizeOps(seqObj[key]);
    }

    for (const key of symbolKeys) {
      let index = 0;
      let newKey = "";
      if (key == Op.eq) newKey = "$op.eq";
      if (key == Op.in) newKey = "$op.in";
      if (key == Op.and) newKey = "$op.and";
      if (key == Op.or) newKey = "$op.or";
      if (key == Op.notIn) newKey = "$op.notIn";
      if (key == Op.not) newKey = "$op.not";
      if (key == Op.ne) newKey = "$op.ne";
      if (newKey) {
        seqObj[newKey] = seqObj[key];
        delete seqObj[key];
      } else {
        newKey = key;
      }
      if (Array.isArray(seqObj[newKey])) {
        seqObj[newKey] = seqObj[newKey].map((item) =>
          this.normalizeSequalizeOps(item),
        );
      } else {
        seqObj[newKey] = this.normalizeSequalizeOps(seqObj[newKey]);
      }
    }
    return seqObj;
  }

  async buildDataClause(input) {
    this.dataClause = input.getDataClause();
    // hook_AfterDataClause
    this.dataClause = await this._afterDataClause(this.input, this.dataClause);
  }

  async createEntityCacher() {
    this.entityCacher = null;
  }

  async indexDataToElastic() {
    //
  }

  async createQueryCacheInvalidator() {
    this.queryCacheInvalidator = null;
  }

  async runDbCommand() {
    this.dbData = null;
  }

  async transposeResult(data) {}

  async raiseDbEvent() {
    if (this.dbEvent) {
      try {
        const _publisher = new ServicePublisher(
          this.dbEvent,
          this.dbData,
          this.session,
          this.requestId,
        );
        _publisher.publish();
      } catch (err) {
        console.log("DbEvent cant be published", this.dbEvent, err);
      }
    }
  }

  async endCommand() {
    await this.runPostHooks();
    await this.postCommand();
    await this.transposeResult(this.dbData);
    await this.raiseDbEvent();
    return this.dbData;
  }

  async buildCommandClauses(input) {
    await this.buildWhereClause(input);
    await this.buildDataClause(input);
  }

  async beginCommand() {
    const mHookResult = await this.runMainHook();
    if (mHookResult || mHookResult === null) return mHookResult;
    const preHookResult = await this.runPreHooks();
    if (preHookResult || preHookResult === null) return preHookResult;
  }

  async preCommand() {}

  async postCommand() {}

  async commandMain() {
    this.location = 8;
    const pcResult = await this.preCommand();
    if (pcResult || pcResult === null) return pcResult;
    this.location = 9;
    const dbResult = await this.runDbCommand();
    if (dbResult || dbResult === null) return dbResult;
  }

  async execute() {
    try {
      await this.createEntityCacher();
      await this.createQueryCacheInvalidator();
      const bcResult = await this.beginCommand();
      if (bcResult) return bcResult;
      await this.buildCommandClauses(this.input);
      const cmResult = await this.commandMain();
      if (cmResult || cmResult === null) return cmResult;
      return await this.endCommand();
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.log(err);
      throw new HttpServerError(
        "errMsg_dbErrorWhenExecuting_" + this.commandName,
        {
          whereClause: this.normalizeSequalizeOps(this.whereClause),
          dataClause: this.dataClause,
          errorStack: err.stack,
          checkoutResult: this.input.checkoutResult,
        },
      );
    }
  }

  getData() {
    return null;
  }

  runHookFunctions(hookName, hookFunctions, hookParams) {
    console.log("Running hook functions for ", hookName);
    try {
      for (const hook of hookFunctions) {
        const result = hook(...hookParams);
        if (result instanceof Error) throw result;
        if (result) return result;
      }
    } catch (err) {
      console.log("Error in hook function", hookName, err);
      return null;
    }
  }
}

module.exports = DbCommand;
