const { Sequelize, Model, DataTypes } = require("sequelize");

let dbName = process.env.DB_NAME ?? process.env.SERVICE_CODENAME ?? "test";
let dbUser = process.env.PG_USER;
let dbPass = process.env.PG_PASSWORD;
let dbHost = process.env.PG_HOST;
let dbPort = process.env.PG_PORT ?? 5432;

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: "postgres",
  logging: false,
  pool: {
    max: 9,
    min: 0,
    idle: 10000,
  },
});

const closePostgres = async () => {
  console.log("Disconnecting PostgresDb");
  await sequelize.close();
};
const connectToDb = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to PostgreSql:", dbHost + "/" + dbName);
    return null;
  } catch (err) {
    console.log(
      "Can not connect to PostgreSql:",
      dbHost + "/" + dbName,
      ":",
      err.message,
    );
    return err;
  }
};

const createPostgresDb = async () => {
  if (!dbName) return;
  const { Client } = require("pg");

  const client = new Client({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: "postgres",
  });

  try {
    await client.connect();
    await client.query('CREATE DATABASE "' + dbName + '"');
    await client.end();
    console.log("created pg database:", dbName);
    await connectToDb();
  } catch (err) {
    if (err) console.log(err.message);
    client.end();
  }
};

const startPostgres = async () => {
  const err = await connectToDb();

  if (err && err.message === 'database "' + dbName + '" does not exist') {
    console.log("creating the db");
    await createPostgresDb();
  }
  await syncModels();
};

const syncModels = async () => {
  //call this function when you are sure all sequelize models are defined
  try {
    await sequelize.sync({ force: false, alter: true }); //{force:true}
    console.log("Postgres db tables synced with sequalize models");
  } catch (err) {
    console.log("Error when sysncing postgres db:", err);
  }
};

module.exports = { startPostgres, syncModels, closePostgres, sequelize };
