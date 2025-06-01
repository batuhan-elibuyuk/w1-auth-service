const mainFunctions = require("./main");

module.exports = {
  // main Database
  // User Db Object
  dbRegisterUser: mainFunctions.dbRegisterUser,
  dbUpdateUser: mainFunctions.dbUpdateUser,
  dbUpdateUserrole: mainFunctions.dbUpdateUserrole,
  dbUpdatePassword: mainFunctions.dbUpdatePassword,
  dbGetUser: mainFunctions.dbGetUser,
  dbListUsers: mainFunctions.dbListUsers,
  createUser: mainFunctions.createUser,
  getIdListOfUserByField: mainFunctions.getIdListOfUserByField,
  getUserById: mainFunctions.getUserById,
  getUserAggById: mainFunctions.getUserAggById,
  getUserListByQuery: mainFunctions.getUserListByQuery,
  getUserStatsByQuery: mainFunctions.getUserStatsByQuery,
  getUserByQuery: mainFunctions.getUserByQuery,
  updateUserById: mainFunctions.updateUserById,
  updateUserByIdList: mainFunctions.updateUserByIdList,
  updateUserByQuery: mainFunctions.updateUserByQuery,
  deleteUserById: mainFunctions.deleteUserById,
  deleteUserByQuery: mainFunctions.deleteUserByQuery,
  getUserByEmail: mainFunctions.getUserByEmail,
};
