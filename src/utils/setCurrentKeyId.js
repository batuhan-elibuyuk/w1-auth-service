const path = require("path");
const fs = require("fs");

module.exports = async () => {
  try {
    if (process.env.NODE_ENV !== "prod") {
      global.currentKeyId = "dev";
      return;
    }

    const keysFolder = process.env.KEYS_FOLDER || "keys";
    const currentKeyIdPath = path.join(
      __dirname,
      "../",
      "../",
      keysFolder,
      "currentKeyId",
    );

    global.currentKeyId = null;
    if (fs.existsSync(currentKeyIdPath)) {
      const currentKeyId = fs.readFileSync(currentKeyIdPath, "utf8");
      global.currentKeyId = currentKeyId;
    } else {
      console.log("Current Key Id not found");
    }
    console.log("Current Key Id: ", global.currentKeyId);
  } catch (err) {
    console.log("Current Key Id not Set");
  }
};
