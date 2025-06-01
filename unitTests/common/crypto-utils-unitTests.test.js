const { expect } = require("chai");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
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
} = require("../../src/common/crypto-utils");

const generateKeyPair = (passPhrase = null) => {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: passPhrase
      ? {
          type: "pkcs8",
          format: "pem",
          cipher: "aes-256-cbc",
          passphrase: passPhrase,
        }
      : { type: "pkcs8", format: "pem" },
  });
};

describe("CryptoUtils", function () {
  const mockPayload = { id: 123, role: "user" };
  const mockSecretKey = "---myTestSecretKeyLengthMustBe32";

  const passPhrase = "testPass";
  const mockKeyPair = generateKeyPair(passPhrase);
  const mockPrivateKey = mockKeyPair.privateKey;
  const mockPublicKey = mockKeyPair.publicKey;
  const mockPassLessKeyPair = generateKeyPair();
  const mockPassLessPrivateKey = mockPassLessKeyPair.privateKey;
  const mockPassLessPublicKey = mockPassLessKeyPair.publicKey;

  describe("createJWT", function () {
    it("should create a valid JWT", function () {
      const token = createJWT(mockPayload, mockSecretKey);
      expect(token).to.exist;
      expect(token).to.be.a("string");

      const decoded = jwt.verify(token, mockSecretKey);

      expect(decoded).to.include(mockPayload);
    });

    it("should use the secretKey in environment variable if none is provided", function () {
      process.env.JWT_KEY = "environmentSecretKey";

      const token = createJWT(mockPayload);

      expect(token).to.exist;

      const decoded = jwt.verify(token, process.env.JWT_KEY);
      expect(decoded).to.include(mockPayload);
    });

    it("should use the harcoded secret key if none is provided in the parameters and environment variables", function () {
      delete process.env.JWT_KEY;
      const hardCodedSecretKey = "aSecretJwtKeyWillBeDefinedLaterInKubernetes";

      const token = createJWT(mockPayload);

      expect(token).to.exist;

      const decoded = jwt.verify(token, hardCodedSecretKey);
      expect(decoded).to.include(mockPayload);
    });

    it("should throw an error when payload is missing", function () {
      expect(() => createJWT(null, mockSecretKey)).to.throw();
    });
  });

  describe("createJWT_RSA", function () {
    it("should create a valid JWT using RSA keys", function () {
      const token = createJWT_RSA(
        mockPayload,
        mockPrivateKey,
        passPhrase,
        "1h",
      );
      expect(token).to.be.a("string");
    });

    it("should create a valid JWT without a passphrase if the key is not encrypted", function () {
      const token = createJWT_RSA(
        mockPayload,
        mockPassLessPrivateKey,
        undefined,
        "1h",
      );
      expect(token).to.be.a("string");
    });

    it("should create a token that can be verified using the public key", function () {
      const token = createJWT_RSA(
        mockPayload,
        mockPrivateKey,
        passPhrase,
        "1h",
      );
      const decoded = jwt.verify(token, mockPublicKey, { algorithm: "RS256" });
      expect(decoded).to.exist;
      expect(decoded).to.include(mockPayload);
    });
    it("should throw if RSA private key or passphrase is invalid", () => {
      //
      expect(() =>
        createJWT_RSA(mockPayload, "bad-key", "wrong-pass", "1h"),
      ).to.throw();
    });
  });

  describe("validateJWT", function () {
    it("should validate a valid JWT", function () {
      const token = jwt.sign(mockPayload, mockSecretKey);
      const payload = validateJWT(token, mockSecretKey);
      expect(payload).to.have.property("id", mockPayload.id);
      expect(payload).to.have.property("role", mockPayload.role);
    });

    it("should return null for an invalid JWT", function () {
      const payload = validateJWT("invalidToken", mockSecretKey);
      expect(payload).to.be.null;
    });
    it("should return null when JWT is expired", () => {
      const expiredToken = jwt.sign(mockPayload, mockSecretKey, {
        expiresIn: -10,
      }); //
      const result = validateJWT(expiredToken, mockSecretKey);
      expect(result).to.be.null;
    });
    it("should validate using explicitly provided jwt key", () => {
      const token = createJWT(mockPayload, "explicitKey");
      const result = validateJWT(token, "explicitKey");
      expect(result).to.have.property("id", mockPayload.id);
    });

    it("should validate using JWT_KEY from environment", () => {
      process.env.JWT_KEY = "envKey";
      const token = createJWT(mockPayload); // uses env
      const result = validateJWT(token); // uses env
      expect(result).to.have.property("id", mockPayload.id);
    });

    it("should validate using hardcoded key fallback", () => {
      delete process.env.JWT_KEY;
      const token = createJWT(mockPayload); // uses fallback
      const result = validateJWT(token);
      expect(result).to.have.property("id", mockPayload.id);
    });
  });

  describe("validateJWT_RSA", function () {
    it("should validate a valid RSA JWT", function () {
      const token = createJWT_RSA(
        mockPayload,
        mockPrivateKey,
        passPhrase,
        "1h",
      );
      const payload = validateJWT_RSA(token, mockPublicKey);
      expect(payload).to.have.property("id", mockPayload.id);
    });

    it("should return null for an invalid RSA JWT", function () {
      const payload = validateJWT_RSA("invalidToken", mockPublicKey);
      expect(payload).to.be.null;
    });
    it("should return null if RSA token is expired", () => {
      const expiredToken = createJWT_RSA(
        mockPayload,
        mockPrivateKey,
        passPhrase,
        "-1h",
      );
      const result = validateJWT_RSA(expiredToken, mockPublicKey);
      expect(result).to.be.null;
    });
    it("should validate RSA token signed without passphrase", () => {
      const token = createJWT_RSA(
        mockPayload,
        mockPassLessPrivateKey,
        undefined,
        "1h",
      );
      const result = validateJWT_RSA(token, mockPassLessPublicKey);
      expect(result).to.have.property("id", mockPayload.id);
    });
  });

  describe("decodeJWT", function () {
    it("should decode a valid JWT", function () {
      const token = jwt.sign(mockPayload, mockSecretKey);
      const decoded = decodeJWT(token);
      expect(decoded.payload).to.have.property("id", mockPayload.id);
      expect(decoded.payload).to.have.property("role", mockPayload.role);
    });

    it("should return null for an invalid JWT", function () {
      const decoded = decodeJWT("invalidToken");
      expect(decoded).to.be.null;
    });
  });

  describe("encodeToken", function () {
    it("should encode a token", function () {
      const text = "testString";
      const encoded = encodeToken(text);
      expect(encoded).to.be.a("string");
    });
  });

  describe("decodeToken", function () {
    it("should decode an encoded token", function () {
      const text = "testString";
      const encoded = encodeToken(text);
      const decoded = decodeToken(encoded);
      expect(decoded).to.equal(text);
    });

    it("should return null for invalid token text", function () {
      const decoded = decodeToken("invalidFormat");
      expect(decoded).to.be.null;
    });
    it("should return null if token format is invalid (no dot)", () => {
      //
      const result = decodeToken("invalidFormatWithoutDot");
      expect(result).to.be.null;
    });

    it("should return null if decrypt fails due to bad hex", () => {
      //
      const result = decodeToken("zzzz.invalidHex");
      expect(result).to.be.null;
    });
  });

  describe("randomCode", function () {
    it("should generate a random string of length 40", function () {
      const code = randomCode();
      expect(code).to.be.a("string").and.have.lengthOf(40);
    });
  });

  describe("hashString", function () {
    it("should hash a string", function () {
      const str = "testPassword";
      const hash = hashString(str);
      expect(hash).to.be.a("string");
    });
    it("should return null if input string is null", () => {
      //
      const result = hashString(null);
      expect(result).to.be.null;
    });
  });

  describe("hashCompare", function () {
    it("should compare a string and its hash correctly", function () {
      const str = "testPassword";
      const hash = hashString(str);
      const isMatch = hashCompare(str, hash);
      expect(isMatch).to.be.true;
    });

    it("should return false if hashes do not match", function () {
      const isMatch = hashCompare("testPassword", "invalidHash");
      expect(isMatch).to.be.false;
    });
    it("should return false if either input to hashCompare is null", () => {
      expect(hashCompare(null, "somehash")).to.be.false;
      expect(hashCompare("value", null)).to.be.false;
    });
  });

  describe("md5", function () {
    it("should create an MD5 hash", function () {
      const input = "testInput";
      const hash = md5(input);
      const expectedHash = crypto.createHash("md5").update(input).digest("hex");
      expect(hash).to.equal(expectedHash);
    });
  });
});
