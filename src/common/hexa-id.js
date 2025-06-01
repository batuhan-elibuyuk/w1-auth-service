const mongoose = require("mongoose");
const { v4 } = require("uuid");

const createHexCode = () => {
  const code = v4();
  return code.replace(/-/g, "");
};

const isValidHex = (str) => /^[A-F0-9]+$/i.test(str);

const isValidObjectId = (oid) => {
  if (!oid) return false;
  if (oid.length !== 24) return false;
  return isValidHex(oid);
};

const isValidUUID = (uuid) => {
  if (typeof uuid !== "string") return false;
  if (!uuid) return false;
  const suuid = shortUUID(uuid);
  if (suuid.length !== 32) return false;
  return isValidHex(suuid);
};

const newObjectId = () => {
  const today = new Date();
  const epoch = today.getTime().toString(16);
  const objId = new mongoose.Types.ObjectId().toString();
  const oid = epoch + objId.slice(epoch.length, 24);
  return oid;
};

const objectIdToUUID = (objectId) => {
  if (!isValidObjectId(objectId)) return objectId;
  const uuid = objectId + "00000000";
  return uuid;
};

const newUUID = (isShort) => {
  const today = new Date();
  const epoch = today.getTime().toString(16);
  const hexCode = createHexCode();
  const uuid = epoch + hexCode.slice(epoch.length, 32);
  return isShort ? uuid : longUUID(uuid);
};

const UUIDtoObjectId = (uuid) => {
  if (typeof uuid !== "string") return uuid;
  if (!isValidUUID(uuid)) return uuid;
  const sid = shortUUID(uuid);
  const oid = sid.slice(0, -8);
  return oid;
};

const shortUUID = (uuid) => {
  if (typeof uuid !== "string") return uuid;
  return uuid.replace(/-/g, "");
};

const longUUID = (uuid) => {
  if (typeof uuid !== "string") return uuid;
  if (!isValidUUID(uuid)) return uuid;

  uuid =
    uuid.slice(0, 8) +
    "-" +
    uuid.slice(8, 12) +
    "-" +
    uuid.slice(12, 16) +
    "-" +
    uuid.slice(16, 20) +
    "-" +
    uuid.slice(20, 32);

  return uuid;
};

module.exports = {
  newUUID,
  newObjectId,
  objectIdToUUID,
  UUIDtoObjectId,
  shortUUID,
  longUUID,
  isValidUUID,
  isValidObjectId,
  createHexCode,
};
