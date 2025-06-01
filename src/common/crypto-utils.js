const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const algorithm = "aes-256-ctr";
const secretKeyValue =
  process.env.SECRET_KEY ?? "---myTestSecretKeyLengthMustBe32";
const secretKey = Buffer.from(secretKeyValue, "binary"); //secret key length must be 32

const createJWT = (payload, jwt_Key) => {
  const jwtKey =
    jwt_Key ??
    (process.env.JWT_KEY || "aSecretJwtKeyWillBeDefinedLaterInKubernetes");
  const token = jwt.sign(payload, jwtKey);

  return token;
};

const createJWT_RSA = (payload, privateKeyPem, passPhrase, expiresIn) => {
  const privateKey = crypto.createPrivateKey({
    key: privateKeyPem,
    format: "pem",
    type: "pkcs1",
    passphrase: passPhrase,
  });

  const jwtOptions = { algorithm: "RS256" };
  if (expiresIn) jwtOptions.expiresIn = expiresIn;

  const token = jwt.sign(payload, privateKey, jwtOptions);
  return token;
};

const validateJWT = (token, jwt_Key) => {
  const jwtKey =
    jwt_Key ??
    (process.env.JWT_KEY || "aSecretJwtKeyWillBeDefinedLaterInKubernetes");
  try {
    const payload = jwt.verify(token, jwtKey);
    return payload;
  } catch (e) {
    console.log(e.message);
    return null;
  }
};

const validateJWT_RSA = (token, publicKey) => {
  try {
    const payload = jwt.verify(token, publicKey, { algorithm: "RS256" });
    return payload;
  } catch (e) {
    console.log(e.message);
    return null;
  }
};

const decodeJWT = (token) => {
  try {
    const decodedToken = jwt.decode(token, {
      complete: true,
    });
    return decodedToken;
  } catch (e) {
    console.log(e.message);
    return null;
  }
};

const decryptToken = (hash) => {
  try {
    const decipher = crypto.createDecipheriv(
      algorithm,
      secretKey,
      Buffer.from(hash.iv, "hex"),
    );
    const decrpyted = Buffer.concat([
      decipher.update(Buffer.from(hash.content, "hex")),
      decipher.final(),
    ]);
    return decrpyted.toString();
  } catch (err) {
    return null;
  }
};

const decodeToken = (tokenText) => {
  const hArray = tokenText.split(".");

  if (hArray.length != 2) {
    return null;
  }
  const hash = { iv: hArray[0], content: hArray[1] };
  return decryptToken(hash);
};

const encodeToken = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  const hash = {
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
  };
  return hash.iv + "." + hash.content;
};

const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
const charactersLength = characters.length;
const randomCode = () => {
  let result = "";
  for (let i = 0; i < 40; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const hashString = (strValue) => {
  if (strValue == null) return null;
  return bcrypt.hashSync(strValue, 4);
};

const hashCompare = (strValue, hashValue) => {
  if (strValue == null || hashValue == null) return false;
  return bcrypt.compareSync(strValue, hashValue);
};

const md5 = (input) => crypto.createHash("md5").update(input).digest("hex");

module.exports = {
  createJWT,
  validateJWT,
  createJWT_RSA,
  validateJWT_RSA,
  decodeJWT,
  encodeToken,
  decodeToken,
  randomCode,
  hashString,
  hashCompare,
  md5,
};
