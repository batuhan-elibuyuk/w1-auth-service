module.exports = {
  // main Database Crud Object Routes Manager Layer Classes
  // User Db Object
  RegisterUserManager: require("./user/register-user"),
  UpdateUserManager: require("./user/update-user"),
  UpdateUserroleManager: require("./user/update-userrole"),
  UpdatePasswordManager: require("./user/update-password"),
  GetUserManager: require("./user/get-user"),
  ListUsersManager: require("./user/list-users"),
};
