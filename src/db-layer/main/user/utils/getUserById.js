const { HttpServerError } = require("common");

let { User } = require("models");
const { hexaLogger } = require("common");
const { Op } = require("sequelize");

const getUserById = async (userId) => {
  try {
    const user = Array.isArray(userId)
      ? await User.findAll({
          where: {
            id: { [Op.in]: userId },
          },
        })
      : await User.findByPk(userId);
    if (!user) {
      return null;
    }
    return Array.isArray(userId)
      ? user.map((item) => item.getData())
      : user.getData();
  } catch (err) {
    console.log(err);
    throw new HttpServerError("errMsg_dbErrorWhenRequestingUserById", err);
  }
};

module.exports = getUserById;
