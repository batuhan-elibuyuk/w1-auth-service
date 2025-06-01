module.exports = {
  DBCreateMongooseCommand: require("./db-create-command")
    .DBCreateMongooseCommand,
  DBHardDeleteMongooseCommand: require("./db-delete-command")
    .DBHardDeleteMongooseCommand,
  DBSoftDeleteMongooseCommand: require("./db-delete-command")
    .DBSoftDeleteMongooseCommand,
  DBGetMongooseCommand: require("./db-get-command").DBGetMongooseCommand,
  DBGetListMongooseCommand: require("./db-getlist-command")
    .DBGetListMongooseCommand,
  DBUpdateMongooseCommand: require("./db-update-command")
    .DBUpdateMongooseCommand,
  DBCreateSequelizeCommand: require("./db-create-command")
    .DBCreateSequelizeCommand,
  DBHardDeleteSequelizeCommand: require("./db-delete-command")
    .DBHardDeleteSequelizeCommand,
  DBSoftDeleteSequelizeCommand: require("./db-delete-command")
    .DBSoftDeleteSequelizeCommand,
  DBGetSequelizeCommand: require("./db-get-command").DBGetSequelizeCommand,
  DBGetListSequelizeCommand: require("./db-getlist-command")
    .DBGetListSequelizeCommand,
  DBUpdateSequelizeCommand: require("./db-update-command")
    .DBUpdateSequelizeCommand,
};
