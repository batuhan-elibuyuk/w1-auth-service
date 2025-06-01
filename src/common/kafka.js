const { Kafka, logLevel } = require("kafkajs");
const crypto = require("crypto");

const kafkaUri = process.env.KAFKA_URI || "localhost:9092";
const serviceName = process.env.SERVICE_CODENAME ?? "mindbricks-service";
const kafkaUserName = process.env.KAFKA_USER ?? "user";
const kafkaPassword = process.env.KAFKA_USER ?? "password";

let kafkaProducer = null;
let kafkaClient = null;
const consumers = [];

const sendMessageToKafka = async (kafkaTopic, data) => {
  try {
    const sResult = kafkaProducer
      ? await kafkaProducer.send({
          topic: kafkaTopic,
          messages: [{ value: JSON.stringify(data) }],
        })
      : null;
    return sResult;
  } catch (err) {
    console.log("Event Raise Error:", err);
    return null;
  }
};

const logCreator =
  (logLevel) =>
  ({ namespace, level, label, log }) => {
    const { message, ...extra } = log;
    if (level === logLevel.ERROR) {
      console.error(`[${label}] ${message}`, extra);
    }
  };

const connectToKafka = async () => {
  kafkaClient = new Kafka({
    clientId: serviceName,
    brokers: [kafkaUri],
    logLevel: logLevel.ERROR,
    logCreator,
  });

  kafkaProducer = kafkaClient.producer();

  try {
    await kafkaProducer.connect();
    console.log("kafka producer connected");
  } catch (err) {
    console.log("kafka producer can not connect", err);
  }
};

const createConsumer = (topic, listener) => {
  const hashes = crypto.getHashes();
  const hash = crypto
    .createHash("shake256", { outputLength: 6 })
    .update(serviceName + (listener ? listener : ""))
    .digest("hex");
  const consumer = kafkaClient.consumer({
    groupId: hash + "-" + topic,
  });
  consumers.push(consumer);
  //console.log('consumer created->', hash + "-" + topic);
  return consumer;
};

const closeKafka = async () => {
  console.log("Disconnecting Kafka producers and consumers...");
  if (kafkaProducer) await kafkaProducer.disconnect();
  consumers.forEach(async (consumer) => {
    await consumer.disconnect();
  });
  consumers.length = 0;
};

module.exports = {
  connectToKafka,
  sendMessageToKafka,
  createConsumer,
  closeKafka,
};
