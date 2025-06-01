const utils = require("./utils");

module.exports = {
  dbRegisterUser: require("./dbRegisterUser"),
  dbUpdateUser: require("./dbUpdateUser"),
  dbUpdateUserrole: require("./dbUpdateUserrole"),
  dbUpdatePassword: require("./dbUpdatePassword"),
  dbGetUser: require("./dbGetUser"),
  dbListUsers: require("./dbListUsers"),
  createUser: utils.createUser,
  getIdListOfUserByField: utils.getIdListOfUserByField,
  getUserById: utils.getUserById,
  getUserAggById: utils.getUserAggById,
  getUserListByQuery: utils.getUserListByQuery,
  getUserStatsByQuery: utils.getUserStatsByQuery,
  getUserByQuery: utils.getUserByQuery,
  updateUserById: utils.updateUserById,
  updateUserByIdList: utils.updateUserByIdList,
  updateUserByQuery: utils.updateUserByQuery,
  deleteUserById: utils.deleteUserById,
  deleteUserByQuery: utils.deleteUserByQuery,
  getUserByEmail: utils.getUserByEmail,
};
