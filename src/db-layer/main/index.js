const userFunctions = require("./user");

module.exports = {
  // main Database
  // User Db Object
  dbRegisterUser: userFunctions.dbRegisterUser,
  dbUpdateUser: userFunctions.dbUpdateUser,
  dbUpdateUserrole: userFunctions.dbUpdateUserrole,
  dbUpdatePassword: userFunctions.dbUpdatePassword,
  dbGetUser: userFunctions.dbGetUser,
  dbListUsers: userFunctions.dbListUsers,
  createUser: userFunctions.createUser,
  getIdListOfUserByField: userFunctions.getIdListOfUserByField,
  getUserById: userFunctions.getUserById,
  getUserAggById: userFunctions.getUserAggById,
  getUserListByQuery: userFunctions.getUserListByQuery,
  getUserStatsByQuery: userFunctions.getUserStatsByQuery,
  getUserByQuery: userFunctions.getUserByQuery,
  updateUserById: userFunctions.updateUserById,
  updateUserByIdList: userFunctions.updateUserByIdList,
  updateUserByQuery: userFunctions.updateUserByQuery,
  deleteUserById: userFunctions.deleteUserById,
  deleteUserByQuery: userFunctions.deleteUserByQuery,
  getUserByEmail: userFunctions.getUserByEmail,
};
