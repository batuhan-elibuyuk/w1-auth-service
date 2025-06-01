const {
  createJWT,
  validateJWT,
  createJWT_RSA,
  validateJWT_RSA,
  decodeJWT,
  encodeToken,
  decodeToken,
  randomCode,
  hashString,
  hashCompare,
  md5,
} = require("./crypto-utils");

const EntityCache = require("./entity-cache");
const ElasticIndexer = require("./elastic-index");
const { QueryCache, QueryCacheInvalidator } = require("./query-cache");

const boolQueryParser = require("./bool-queryparser");

const KafkaPublisher = require("./kafka-publisher");
const KafkaListener = require("./kafka-listener");

const {
  NotificationSender,
  EmailSender,
  SmsSender,
  DataSender,
} = require("./notification-senders");

const requestIdStamper = require("./requestIdStamper");

const {
  connectToKafka,
  sendMessageToKafka,
  createConsumer,
  closeKafka,
} = require("./kafka");

const { connectToElastic, closeElastic, elasticClient } = require("./elastic");
const {
  redisClient,
  connectToRedis,
  getRedisData,
  setRedisData,
} = require("./redis");

const {
  getRestData,
  sendRestRequest,
  downloadFile,
} = require("./getRemoteData");

const { HexaLogTypes, hexaLogger } = require("./hexa-logger");

const {
  mongoose,
  connectToMongoDb,
  closeMongoDbConnection,
} = require("./hexa-mongo");

const {
  startPostgres,
  syncModels,
  closePostgres,
  sequelize,
} = require("./postgres");

const {
  errorHandler,
  HttpError,
  NotFoundError,
  BadRequestError,
  HttpServerError,
  ForbiddenError,
  NotAuthenticatedError,
  ErrorCodes,
} = require("./error");

const {
  newUUID,
  newObjectId,
  objectIdToUUID,
  UUIDtoObjectId,
  shortUUID,
  longUUID,
  isValidUUID,
  isValidObjectId,
  createHexCode,
} = require("./hexa-id");

const { concatListResults, mapArrayItems } = require("./utils");

const {
  buildSequelizeClause,
  buildMongooseClause,
  buildElasticClause,
} = require("./build-clause");

const { renderTemplate, renderTemplateSource } = require("./render");

const {
  PaymentGate,
  createPaymentGate,
  registerPaymentGate,
  getPaymentGate,
  paymentGatePool,
  PaymentGateError,
} = require("./paymentGate");

const stripeGateWay = require("./stripeGate");
const sendSmptEmail = require("./send-smtp-mail");

const {
  convertUserQueryToSequelizeQuery,
  convertUserQueryToElasticQuery,
} = require("./queryBuilder");
module.exports = {
  checkUserHasRightForObject: require("./permission"),
  createJWT,
  validateJWT,
  createJWT_RSA,
  validateJWT_RSA,
  decodeJWT,
  encodeToken,
  decodeToken,
  randomCode,
  hashString,
  hashCompare,
  md5,
  EntityCache,
  QueryCache,
  QueryCacheInvalidator,
  boolQueryParser,
  newUUID,
  ElasticIndexer,
  connectToKafka,
  sendMessageToKafka,
  createConsumer,
  closeKafka,
  KafkaPublisher,
  KafkaListener,
  connectToElastic,
  closeElastic,
  elasticClient,
  getRedisData,
  setRedisData,
  getRestData,
  sendRestRequest,
  downloadFile,
  redisClient,
  connectToRedis,
  newUUID,
  newObjectId,
  objectIdToUUID,
  UUIDtoObjectId,
  shortUUID,
  longUUID,
  isValidUUID,
  isValidObjectId,
  createHexCode,
  mongoose,
  connectToMongoDb,
  closeMongoDbConnection,
  hexaLogger,
  HexaLogTypes,
  startPostgres,
  syncModels,
  closePostgres,
  sequelize,
  errorHandler,
  HttpError,
  NotFoundError,
  BadRequestError,
  HttpServerError,
  ForbiddenError,
  NotAuthenticatedError,
  ErrorCodes,
  concatListResults,
  mapArrayItems,
  requestIdStamper,
  NotificationSender,
  EmailSender,
  SmsSender,
  DataSender,
  renderTemplate,
  renderTemplateSource,
  buildSequelizeClause,
  buildMongooseClause,
  buildElasticClause,
  paymentGatePool,
  PaymentGate,
  PaymentGateError,
  createPaymentGate,
  registerPaymentGate,
  getPaymentGate,
  stripeGateWay,
  stripeGateway: stripeGateWay,
  sendSmptEmail: require("./send-smtp-mail"),
  convertUserQueryToSequelizeQuery,
  convertUserQueryToElasticQuery,
  ...require("./imageUtils"),
};
