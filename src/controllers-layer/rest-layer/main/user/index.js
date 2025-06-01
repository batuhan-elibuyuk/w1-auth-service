const express = require("express");

// User Db Object Rest Api Router
const userRouter = express.Router();

// add User controllers

// registerUser controller
userRouter.post("/registeruser", require("./register-user"));
// updateUser controller
userRouter.patch("/users/:userId", require("./update-user"));
// updateUserRole controller
userRouter.patch("/userrole/:userId", require("./update-userrole"));
// updatePassword controller
userRouter.patch("/password/:userId", require("./update-password"));
// getUser controller
userRouter.get("/users/:userId", require("./get-user"));
// listUsers controller
userRouter.get("/users", require("./list-users"));

module.exports = userRouter;
