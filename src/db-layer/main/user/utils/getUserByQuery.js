const { HttpServerError, BadRequestError } = require("common");

const { User } = require("models");
const { Op } = require("sequelize");
const { hexaLogger } = require("common");

const getUserByQuery = async (query) => {
  try {
    if (!query || typeof query !== "object") {
      throw new BadRequestError(
        "Invalid query provided. Query must be an object.",
      );
    }
    const user = await User.findOne({ where: query });
    if (!user) return null;
    return user.getData();
  } catch (err) {
    throw new HttpServerError("errMsg_dbErrorWhenRequestingUserByQuery", err);
  }
};

module.exports = getUserByQuery;
