module.exports = {
  initService: require("./init-service.js"),
  getPublicKey: require("./getPublicKey.js"),
  setCurrentKeyId: require("./setCurrentKeyId.js"),
  syncElasticIndexData: require("./syncElasticData.js"),
  ...require("./crons"),
};
