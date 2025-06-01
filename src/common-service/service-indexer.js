const { ElasticIndexer, hexaLogger } = require("common");

const ServicePublisher = require("./service-publisher");

const MAPPINGS = {};

class ServiceIndexer extends ElasticIndexer {
  constructor(indexName, session, requestId) {
    const serviceIndexName = "w1_" + indexName.toLowerCase();
    super(serviceIndexName, { mapping: MAPPINGS[indexName] });
    this.session = session;
    this.requestId = requestId;
  }

  static addMapping(indexName, mapping) {
    MAPPINGS[indexName] = mapping;
  }

  async logResult(logType, subject, params, location, data) {
    return hexaLogger.insertLog(logType, 1, subject, params, location, data);
  }

  async publishEvent(eventName, data) {
    const _publisher = new ServicePublisher(
      eventName,
      data,
      this.session,
      this.requestId,
    );
    return _publisher.publish();
  }
}

module.exports = ServiceIndexer;
