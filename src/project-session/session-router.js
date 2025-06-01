const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const createSession = require("./create-session");

const unless = function (paths, middleware) {
  return function (req, res, next) {
    const filtered = paths.find((path) => req.path.endsWith(path));
    return filtered ? next() : middleware(req, res, next);
  };
};

const addSessionRoutes = () => {
  router.use("", (req, res, next) => {
    console.log("session manager is resolving tenant");
    const session = createSession();
    session.tenantResolver(req, res, next);
  });

  router.use(
    unless(["/login", "/linksession", "/favicon.ico"], (req, res, next) => {
      const session = createSession();
      console.log("session manager is verifying request");
      session.verifySessionToken(req, res, next);
    }),
  );

  router.use((req, res, next) => {
    if (req.path.endsWith("/relogin")) req.userAuthUpdate = true;
    next();
  });

  router.get("/relogin", (req, res) => {
    if (req.session) {
      res.status(200).send(req.session);
    } else {
      res.status(401).send("Can not relogin");
    }
  });

  router.get("/currentuser", (req, res) => {
    if (req.user) {
      return res.status(200).send(req.user);
    }
    if (req.session) {
      req.session.accessToken = req.auth.accessToken;
      res.status(200).send(req.session);
    } else {
      res.status(401).send("No login found");
    }
  });

  router.get("/permissions", async (req, res) => {
    try {
      if (req.auth) {
        console.log("asking for permissions of user:", req.session.userId);
        const pAll = await req.auth.getCurrentUserPermissions();
        res.status(200).send(pAll);
      } else {
        res.status(401).send("No login found");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  router.get("/rolepermissions", async (req, res) => {
    try {
      if (req.auth) {
        console.log("asking for permissions of role:", req.session.roleId);
        const pAll = await req.auth.getCurrentRolePermissions();
        res.status(200).send(pAll);
      } else {
        res.status(401).send("No login found");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  router.get("/permissions/:permissionName", async (req, res) => {
    try {
      const pName = req.params.permissionName;
      if (req.auth) {
        console.log("asking for permission filter of:", pName);
        const pFilter = await req.auth.getPermissionFilter(pName);
        res.status(200).send(pFilter);
      } else {
        res.status(401).send("No login found");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  router.get("/linksession", (req, res) => {
    try {
      const accessToken = req.query.token;

      const cookieName = process.env.COOKIE_NAME;
      res
        .cookie(cookieName, accessToken, {
          httpOnly: true,
          domain: process.env.COOKIE_URL,
        })
        .status(200)
        .send({
          cookieName,
          accessToken,
          domain: process.env.COOKIE_URL,
          currentuser: process.env.SERVICE_URL + "/currentuser",
        });
    } catch (err) {
      res.status(401).send(err.message);
    }
  });
};

const addLoginRoutes = () => {
  router.get("/login", (req, res, next) => {
    const loginSession = createSession();
    loginSession.getLoginPage(req, res, next);
  });

  router.post("/login", (req, res, next) => {
    const loginSession = createSession();
    loginSession.loginUserController(req, res, next);
  });

  router.post("/logout", (req, res, next) => {
    const loginSession = createSession();
    loginSession.logoutUserController(req, res, next);
  });

  router.get("/publickey", (req, res, next) => {
    const fs = require("fs");
    keyFolderName = process.env.KEYS_FOLDER ?? "keys";
    const keyId = req.query.keyId ?? global.currentKeyId;
    const keyPath = path.join(
      __dirname,
      "../../" + keyFolderName + "/rsa.key.pub." + keyId,
    );
    console.log("loking for public key:", keyPath);

    const keyData = fs.existsSync(keyPath)
      ? fs.readFileSync(keyPath, "utf8")
      : null;
    if (!keyData) {
      return res.status(404).send("Public key not found");
    }
    res.status(200).json({ keyId: keyId, keyData });
  });
};

const getVerificationServicesRouter = () => {
  const verificationServicesRouter = require("../verification-services");
  return verificationServicesRouter;
};

const getSessionRouter = () => {
  addSessionRoutes();
  return router;
};

const getLoginRouter = () => {
  addSessionRoutes();
  addLoginRoutes();
  return router;
};

module.exports = {
  getSessionRouter,
  getLoginRouter,
  getVerificationServicesRouter,
};
