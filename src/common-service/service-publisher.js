const { KafkaPublisher } = require("common");
const { hexaLogger } = require("common");
const v4 = require("uuid").v4;

class ServicePublisher extends KafkaPublisher {
  constructor(topic, data, session, requestId) {
    const publishedData = JSON.parse(JSON.stringify(data));
    publishedData.session = session;
    publishedData._eventId = v4();
    publishedData._requestId = requestId;
    //console.log('sessionId in Service Publisher:',publishedData.session?.sessionId);
    super(topic, publishedData);
  }
}

module.exports = ServicePublisher;
