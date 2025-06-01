const mongoose = require("mongoose");

const serviceName = process.env.SERVICE_CODENAME || "hexa-test";

let mongoMemoryServer = null;

mongoose.set("strictQuery", true);

const closeMongoDbConnection = async () => {
  console.log("Disconnecting MongoDb...");
  await mongoose.connection.close();
};

const connectToMongoDb = async (mongoUri) => {
  let uri = mongoUri;

  if (mongoUri === undefined || !mongoUri) {
    uri =
      (process.env.MONGO_URI || "mongodb://localhost:27017") +
      "/" +
      serviceName;
  }

  try {
    mongoose.mongoUri = uri;
    await mongoose.connect(mongoose.mongoUri, {});
    console.log("Connected to MongoDb:", mongoose.mongoUri);
    return null;
  } catch (err) {
    console.log("Can not connect to MongoDb:", mongoose.mongoUri);
    console.log(err);
    return err;
  }
};

module.exports = { mongoose, connectToMongoDb, closeMongoDbConnection };
