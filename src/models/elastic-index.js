const { ElasticIndexer } = require("serviceCommon");
const { hexaLogger } = require("common");

const userMapping = {
  id: { type: "keyword" },
  _owner: { type: "keyword" },
  email: { type: "keyword", index: true },
  password: { type: "keyword", index: false },
  fullname: { type: "keyword", index: true },
  avatar: { type: "keyword", index: false },
  emailVerified: { type: "boolean", null_value: false },
  isActive: { type: "boolean" },
  recordVersion: { type: "integer" },
  createdAt: { type: "date" },
  updatedAt: { type: "date" },
};

const updateElasticIndexMappings = async () => {
  try {
    ElasticIndexer.addMapping("user", userMapping);
    await new ElasticIndexer("user").updateMapping(userMapping);
  } catch (err) {
    hexaLogger.insertError(
      "UpdateElasticIndexMappingsError",
      { function: "updateElasticIndexMappings" },
      "elastic-index.js->updateElasticIndexMappings",
      err,
    );
  }
};

module.exports = updateElasticIndexMappings;
