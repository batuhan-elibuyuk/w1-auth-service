const HexaListener = require("./hexa-listener");
const { createConsumer } = require("./kafka");
const { hexaLogger, HexaLogTypes } = require("../common/hexa-logger");

class KafkaListener extends HexaListener {
  async internalHandler(topic, message) {
    try {
      const controller = this.eventHandler;
      const dataStr = message.value.toString();
      const listenerData = JSON.parse(dataStr);

      hexaLogger.insertInfo(
        "NewEventArrived",
        { topic: topic },
        "kafka-listener.js->eachMessage",
        listenerData,
      );

      const session = listenerData.session;
      const sessionId = session?.sessionId;

      hexaLogger.insertInfo(
        "EventSessionRetrieved",
        { sessionId: sessionId },
        "kafka-listener.js->eachMessage",
        session,
      );

      const response = await controller(
        topic,
        session,
        listenerData,
        this.callBackData,
      );
      const data = {};
      data[topic] = listenerData;

      let isProcessed = true;
      let isError = false;
      if (typeof response === "boolean") {
        isProcessed = response;
        isError = !isProcessed;
      } else if (response && typeof response === "object") {
        isError = response.response instanceof Error;
        isProcessed = response.eventProcess;
        if (isError) response.response = response.response.message;
        data[topic + "-response"] =
          response.response ?? "noResponseDataReturned";
      }

      if (isError) {
        hexaLogger.insertError(
          "EventCanNotProcessed",
          { topic: topic },
          "kafka-listener.js->eachMessage",
          data,
        );
      } else {
        hexaLogger.insertInfo(
          "EventIsProcessed",
          { topic: topic },
          "kafka-listener.js->eachMessage",
          data,
        );
      }
    } catch (err) {
      // log the error
      hexaLogger.insertError(
        "ListenerError",
        { topic: topic, err: err.message },
        "kafka-listener.js->eachMessage",
        err,
      );

      console.log(`Listener Controller Error In ${topic}:${err.message}`);
    }
  }

  async listen() {
    const consumer = createConsumer(this.eventName, this.listenerType);
    await consumer.connect();
    await consumer.subscribe({
      topics: [this.eventName],
      fromBeginning: true,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
        // dont await this not to have consumer lag
        this.internalHandler(topic, message);
        return true;
      },
    });
    return true;
  }
}

module.exports = KafkaListener;
