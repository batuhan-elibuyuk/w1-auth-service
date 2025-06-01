module.exports = {
  AuthServiceManager: require("./service-manager/AuthServiceManager"),
  // main Database Crud Object Routes Manager Layer Classes
  // User Db Object
  RegisterUserManager: require("./main/user/register-user"),
  UpdateUserManager: require("./main/user/update-user"),
  UpdateUserroleManager: require("./main/user/update-userrole"),
  UpdatePasswordManager: require("./main/user/update-password"),
  GetUserManager: require("./main/user/get-user"),
  ListUsersManager: require("./main/user/list-users"),
};
