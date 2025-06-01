const path = require("path");
const fs = require("fs");
const { getRestData } = require("common");

module.exports = async (keyId) => {
  try {
    const keysFolder = process.env.KEYS_FOLDER || "keys";

    const userServicePublickKeyApi =
      process.env.SERVICE_URL.replace(process.env.SERVICE_SHORT_NAME, "auth") +
      "/publickey" +
      (keyId ? "?keyId=" + keyId : "");
    const publicKey = await getRestData(userServicePublickKeyApi);
    if (publicKey instanceof Error) {
      throw publicKey;
    }
    if (
      publicKey &&
      publicKey.keyId &&
      publicKey.keyData &&
      publicKey.keyData.startsWith("-----BEGIN PUBLIC KEY-----")
    ) {
      const publicKeyPath = path.join(
        __dirname,
        "../",
        "../",
        keysFolder,
        "rsa.key.pub." + publicKey.keyId,
      );

      fs.writeFileSync(publicKeyPath, publicKey.keyData);
      console.log(
        "Public key with id updated from the server",
        publicKey.keyId,
      );
      return publicKey;
    } else {
      console.log("Public key not found from the server");
      return null;
    }
  } catch (err) {
    console.log("Error in getPublicKey");
    console.log(err?.message || err);
    return null;
  }
};
