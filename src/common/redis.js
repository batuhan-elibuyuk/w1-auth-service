const { createClient } = require("redis");

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || 6379;
const redisUser = process.env.REDIS_USER || null;
const redisPwd = process.env.REDIS_PWD || null;

let redisUri = `redis://${redisHost}:${redisPort}`;
if (redisUser && redisPwd) {
  redisUri = `redis://${redisUser}:${redisPwd}@${redisHost}:${redisPort}`;
}

// const redisClient = createClient({
//   url: redisUri,
// });

const redisClient = createClient({
  socket: {
    host: redisHost,
    port: redisPort,
  },
  username: redisUser,
  password: redisPwd,
});
redisClient.on("error", (err) => console.log("Redis Client Error", err));

const getRedisData = async (key) => {
  try {
    if (!redisClient.isOpen) await connectToRedis();
    let data = null;
    const dataStr = await redisClient.get(key);
    if (dataStr) {
      try {
        data = JSON.parse(dataStr);
        if (typeof data === "object") data.source = "redis";
      } catch (err) {
        data = dataStr;
      }
    }
    return data;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const setRedisData = async (key, data, exp) => {
  try {
    if (!redisClient.isOpen) await connectToRedis();
    if (typeof data === "object") {
      data = JSON.stringify(data);
    }
    await redisClient.set(key, data);
    if (exp) {
      await redisClient.expire(key, exp);
    }
  } catch (err) {
    console.log(err);
  }
};

const connectToRedis = async () => {
  console.log("connecting to redis", `redis://${redisHost}:${redisPort}`);
  try {
    await redisClient.connect();
    console.log("connected to redis", `redis://${redisHost}:${redisPort}`);
  } catch (err) {
    console.log(err);
    console.log("cannot connect redis", `redis://${redisHost}:${redisPort}`);
  }
};

module.exports = { redisClient, connectToRedis, getRedisData, setRedisData };
