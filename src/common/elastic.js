const { Client } = require("@elastic/elasticsearch");
const elasticUri = process.env.ELASTIC_URI || "http://localhost:9200";
const elasticUser = process.env.ELASTIC_USER || "elastic";
const elasticPwd = process.env.ELASTIC_PWD || "zci+imLCfkbSC=RxLHjH";
const elasticApiKey = null; // process.env.ELASTIC_API_KEY || null;

let elasticClient = null;
try {
  elasticClient = new Client({
    node: elasticUri,
    requestTimeout: 10000,
    auth: {
      username: elasticApiKey ? undefined : elasticUser,
      password: elasticApiKey ? undefined : elasticPwd,
      apiKey: elasticApiKey,
    },
    ssl: {
      ca: process.env.ELASTIC_CERT,
      rejectUnauthorized: false,
    },
  });
} catch (err) {
  elasticClient = null;
  console.log("elasticClient can not be created", err.message);
}

const connectToElastic = async () => {
  //
  if (elasticClient) {
    try {
      const info = await elasticClient.info();
      console.log("elasticClient connected:", info);
    } catch (err) {
      console.log(
        "elasticClient not connected:",
        err.toString() + "->" + err.message,
      );
    }
  } else {
    console.log("elasticClient not connected:null client");
  }
};

const closeElastic = () => {
  elasticClient.close();
};

module.exports = { connectToElastic, closeElastic, elasticClient };
