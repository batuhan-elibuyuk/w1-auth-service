const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoFile = path.join(
  __dirname,
  "controllers-layer",
  "grpc-layer",
  "proto",
  "auth.proto",
);

console.log("Loading proto file from:", protoFile);
try {
  const stats = require("fs").statSync(protoFile);
  console.log("Proto file exists, size:", stats.size, "bytes");
} catch (err) {
  console.error("Error accessing proto file:", err.message);
}

const packageDef = protoLoader.loadSync(protoFile, {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const authPackage = grpcObject.auth;

const server = new grpc.Server();

function currentUser(call, callback) {
  callback(null, {});
}

function helloMessage(call, callback) {
  callback(null, { hello: "hello, this is w-auth-service" });
}

const {} = require("./controllers-layer/grpc-layer");

server.addService(authPackage.authService.service, {
  currentUser,
  helloMessage,
});

module.exports = server;
