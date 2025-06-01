const { elasticClient } = require("./elastic");
const { v4 } = require("uuid");

const loggerType = "ELASTIC";

const createHexCode = () => {
  const code = v4();
  return code.replace(/-/g, "");
};

const HexaLogTypes = {
  logTypeInfo: 0,
  logTypeWarning: 1,
  logTypeError: 2,
};

const HexaLogTypeNames = ["INFO", "WARNING", "ERROR"];

const msInDay = 24 * 60 * 60 * 1000;

const elasticMappings = {
  properties: {
    date: { type: "date" },
    logSource: { type: "keyword" },
    logType: { type: "integer" },
    logTypeName: { type: "keyword" },
    logLevel: { type: "integer" },
    requestId: { type: "keyword" },
    location: { type: "keyword" },
    subject: { type: "keyword" },
    params: { type: "object", enabled: false },
    data: { type: "object", enabled: false },
  },
};

class HexaLog {
  constructor(
    logType,
    logLevel,
    logSource,
    subject,
    params,
    location,
    data,
    requestId,
  ) {
    this.date = new Date();
    this.logType = logType;
    this.logLevel = logLevel;
    this.logSource = logSource;
    this.subject = subject;
    this.location = location;
    this.params = params;
    this.data = data;
    this.logged = false;
    this.requestId = requestId;
    this.id = createHexCode();
  }

  logLevelX() {
    if (this.logLevel < 10) return "0" + this.logLevel.toString();
    return this.logLevel.toString();
  }

  logTypeName() {
    return HexaLogTypeNames[this.logType];
  }

  logTypeNameX() {
    return HexaLogTypeNames[this.logType];
  }

  getLogHeader() {
    return `${this.logTypeNameX()}:${this.logLevelX()}`;
  }

  toObject() {
    return {
      date: this.date,
      requestId: this.requestId,
      logType: this.logType,
      logTypeName: this.logTypeName(),
      logLevel: this.logLevel,
      logSource: this.logSource,
      subject: this.subject,
      location: this.location,
      params: this.params,
      data: this.data,
    };
  }

  toJSON() {
    return JSON.stringify(this.toObject());
  }
}

class HexaLogger {
  constructor() {
    this.logs = [];
    this.projectName = process.env.PROJECT_CODENAME ?? "hexalogger";
    this.logSource = process.env.SERVICE_NAME ?? "hexalogger";
    this.writeDetail = true;
    this.logPeriod = 30;
  }

  async insertLog(
    logType,
    logLevel,
    subject,
    params,
    location,
    data,
    requestId,
    waitForWrite,
  ) {
    const newLog = new HexaLog(
      logType,
      logLevel,
      this.logSource,
      subject,
      params,
      location,
      data,
      requestId,
    );
    this.logs.push(newLog);
    if (waitForWrite) {
      await this.logToTarget();
    } else {
      this.logToTarget();
    }
  }

  async insertError(subject, params, location, data, requestId, waitForWrite) {
    if (data instanceof Error) {
      data = {
        message: data.message,
        stack: data.stack,
        name: data.name,
        cause: data.cause,
      };
    }

    const newLog = new HexaLog(
      HexaLogTypes.logTypeError,
      1,
      this.logSource,
      subject,
      params,
      location,
      data,
      requestId,
      waitForWrite,
    );

    this.logs.push(newLog);
    if (waitForWrite) {
      await this.logToTarget();
    } else {
      this.logToTarget();
    }
  }

  async insertWarning(
    subject,
    params,
    location,
    data,
    requestId,
    waitForWrite,
  ) {
    const newLog = new HexaLog(
      HexaLogTypes.logTypeWarning,
      1,
      this.logSource,
      subject,
      params,
      location,
      data,
      requestId,
      waitForWrite,
    );
    this.logs.push(newLog);
    if (waitForWrite) {
      await this.logToTarget();
    } else {
      this.logToTarget();
    }
  }

  async insertInfo(subject, params, location, data, requestId, waitForWrite) {
    const newLog = new HexaLog(
      HexaLogTypes.logTypeInfo,
      1,
      this.logSource,
      subject,
      params,
      location,
      data,
      requestId,
    );
    this.logs.push(newLog);
    if (waitForWrite) {
      await this.logToTarget();
    } else {
      this.logToTarget();
    }
  }

  async writeLog(hexaLog) {
    console.log(
      `${hexaLog.date.toISOString()}:${
        this.projectName
      }.${hexaLog.getLogHeader()}>>${hexaLog.source}:${hexaLog.subject}`,
    );
    if (this.writeDetail) console.log(hexaLog.data);
    return true;
  }

  async logToTarget() {
    const logs = this.logs.filter((log) => !log.logged);
    for (const hexaLog of this.logs) {
      if (!hexaLog.logged) {
        hexaLog.logged = true;
        const result = await this.writeLog(hexaLog);
        if (!result) hexaLog.logged = false;
      }
    }
  }

  async clearLogs() {
    this.logs = this.logs.filter((log) => !log.logged);
  }

  async clearLogStore() {}
  async clearAgedLogs() {}
}

class ElasticSearchLogger extends HexaLogger {
  async updateLoggerMappings() {
    const indexName = this.projectName + "_logs";

    // check if index exists
    const indexExists = await elasticClient.indices.exists({
      index: indexName,
    });
    if (!indexExists) {
      // create index with mappings
      await elasticClient.indices.create({
        index: indexName,
        body: {
          mappings: elasticMappings,
        },
      });
    }

    await elasticClient.indices.putMapping({
      index: indexName,
      properties: elasticMappings.properties,
    });
  }

  async writeLog(hexaLog) {
    const indexName = this.projectName + "_logs";

    try {
      await this.updateLoggerMappings();
    } catch (err) {
      console.log("Error updating logger mappings:", err);
      return false;
    }

    try {
      let result = await elasticClient.index({
        index: indexName,
        id: hexaLog.id,
        body: hexaLog.toObject(),
      });
      return (
        result &&
        result._id &&
        (result.result == "created" || result.result == "updated")
      );
    } catch (err) {
      //console.log('Can not write log ->', hexaLog.subject ,  hexaLog.location, err.toString());
      return false;
    }
  }

  async clearLogStore() {
    const indexName = this.projectName + "_logs";
    try {
      const result = await elasticClient.deleteByQuery({
        index: indexName,
        query: {
          match_all: {},
        },
      });
      return result && result.deleted ? result.deleted : 0;
    } catch (err) {
      console.log(err);
      return 0;
    }
  }

  async clearAgedLogs() {
    try {
      const dateLimit = new Date(Date.now() - this.logPeriod * msInDay);
      const indexName = this.projectName + "_logs";
      const result = await elasticClient.deleteByQuery({
        index: indexName,
        query: {
          range: { date: { lte: dateLimit } },
        },
      });
      return result && result.deleted ? result.deleted : 0;
    } catch (err) {
      console.log(err);
      return 0;
    }
  }

  // class end
}

let hexaLogger = null;
const createHexaLogger = () => {
  if (hexaLogger) return hexaLogger;
  if (loggerType == "ELASTIC") {
    hexaLogger = new ElasticSearchLogger();
  } else {
    hexaLogger = new HexaLogger();
  }
  return hexaLogger;
};

module.exports = {
  hexaLogger: createHexaLogger(),
  HexaLogTypes,
};
