const { hexaLogger, HexaLogTypes, KafkaPublisher } = require("common");
const ApiManager = require("../../manager-layer/service-manager/ApiManager");

class KafkaController {
  constructor(name, routeName, message, kafkaSettings) {
    this.name = name;
    this.routeName = routeName;
    this.message = message;

    this.requestTopic = kafkaSettings.requestTopicName;
    this.responseTopic = kafkaSettings.responseTopicName;

    this.apiManager = null;
    this.response = {};
    this.businessOutput = null;
    this.crudType = kafkaSettings.crudType;
    this.status = 200;
    this.dataName = "kafkaData";
    this.requestId = message?.requestId;
    this.startTime = null;

    this.routePath = `${this.routeName}.js->${this.name}`;
  }

  async createApiManager() {
    //implement in child class
  }

  async publishResponse() {
    try {
      const responsePayload = {
        status: "OK",
        statusCode: this.status,
        data: this.response,
        requestId: this.requestId,
        metadata: {
          processedAt: new Date().toISOString(),
          processingTime: Date.now() - this.startTime,
          routePath: this.routePath,
        },
      };

      const publisher = new KafkaPublisher(this.responseTopic, responsePayload);
      const result = await publisher.publish();
      if (result) {
        await this._logResponse(responsePayload);
      }

      return result;
    } catch (error) {
      await this._logPublishError(error);
      throw error;
    }
  }

  async _logRequest() {
    hexaLogger.insertInfo(
      "KafkaRequestReceived",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      { [`${this.name}_KafkaRequest`]: this.message },
      this.requestId,
    );
  }

  async _logResponse() {
    hexaLogger.insertInfo(
      "KafkaRequestResponded",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      { [`${this.name}_KafkaResponse`]: this.response },
      this.requestId,
    );
  }

  async _logPublishError(error) {
    hexaLogger.insertError(
      "KafkaPublishError",
      {
        function: this.name,
        error: error.message,
      },
      `${this.routeName}.js->${this.name}`,
      error,
      this.requestId,
    );
  }

  async handleError(error) {
    const errorPayload = {
      status: "ERROR",
      statusCode: 500, //??
      error: error.message,
      requestId: this.requestId,
      metadata: {
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - this.startTime,
        routePath: `${this.routeName}.js->${this.name}`,
      },
    };

    try {
      const publisher = new KafkaPublisher(this.responseTopic, errorPayload);
      await publisher.publish();
    } catch (publishError) {
      await this._logPublishError(publishError);
    }

    hexaLogger.insertError(
      "KafkaProcessingError",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      error,
      this.requestId,
    );
  }

  async processMessage() {
    try {
      await this._logRequest();
      this.startTime = Date.now();

      this.apiManager = await this.createApiManager();
      this.response = await this.apiManager.execute();

      await this.publishResponse();
      return this.response;
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }
}

module.exports = KafkaController;
