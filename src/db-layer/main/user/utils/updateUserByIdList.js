const { HttpServerError } = require("common");

const { User } = require("models");
const { Op } = require("sequelize");
const { hexaLogger } = require("common");

const updateUserByIdList = async (idList, dataClause) => {
  try {
    let rowsCount = null;
    let rows = null;
    const options = {
      where: { id: { [Op.in]: idList }, isActive: true },
      returning: true,
    };
    [rowsCount, rows] = await User.update(dataClause, options);
    const userIdList = rows.map((item) => item.id);
    return userIdList;
  } catch (err) {
    throw new HttpServerError("errMsg_dbErrorWhenUpdatingUserByIdList", err);
  }
};

module.exports = updateUserByIdList;
