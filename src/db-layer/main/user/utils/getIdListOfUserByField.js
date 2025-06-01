const { HttpServerError, NotFoundError, BadRequestError } = require("common");

const { User } = require("models");
const { Op } = require("sequelize");
const { hexaLogger } = require("common");

const getIdListOfUserByField = async (fieldName, fieldValue, isArray) => {
  try {
    let isValidField = false;

    const userProperties = [
      "id",
      "email",
      "password",
      "fullname",
      "avatar",
      "emailVerified",
    ];

    isValidField = userProperties.includes(fieldName);

    if (!isValidField) {
      throw new BadRequestError(`Invalid field name: ${fieldName}.`);
    }

    const expectedType = typeof User[fieldName];

    if (typeof fieldValue !== expectedType) {
      throw new BadRequestError(
        `Invalid field value type for ${fieldName}. Expected ${expectedType}.`,
      );
    }

    const options = {
      where: isArray
        ? { [fieldName]: { [Op.contains]: [fieldValue] }, isActive: true }
        : { [fieldName]: fieldValue, isActive: true },
      attributes: ["id"],
    };

    let userIdList = await User.findAll(options);

    if (!userIdList || userIdList.length === 0) {
      throw new NotFoundError(`User with the specified criteria not found`);
    }

    userIdList = userIdList.map((item) => item.id);
    return userIdList;
  } catch (err) {
    hexaLogger.insertError(
      "DatabaseError",
      { function: "getIdListOfUserByField", fieldValue: fieldValue },
      "getIdListOfUserByField.js->getIdListOfUserByField",
      err,
      null,
    );
    throw new HttpServerError(
      "errMsg_dbErrorWhenRequestingUserIdListByField",
      err,
    );
  }
};

module.exports = getIdListOfUserByField;
