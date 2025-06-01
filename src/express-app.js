const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const {
  boolQueryParser,
  errorHandler,
  hexaLogger,
  requestIdStamper,
} = require("common");
const path = require("path");
const fs = require("fs");
const apiFace = require("./api-face");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

const {
  getLoginRouter,
  getVerificationServicesRouter,
} = require("./project-session/session-router");
const sessionRouter = getLoginRouter();
const verificationServicesRouter = getVerificationServicesRouter();

const socialLoginRouter = require("./project-session/social-login-router");

/*
 */

const { version } = require("../package.json");

const { edgeRouter } = require("edgeLayer");

const app = express();

const unless = function (paths, middleware) {
  return function (req, res, next) {
    const filtered = paths.find((path) => req.path.endsWith(path));
    return filtered ? next() : middleware(req, res, next);
  };
};
app.use(cookieParser());

const servicePort = process.env.HTTP_PORT ?? 3000;
const corsOrigin = process.env.CORS_ORIGIN;
const exposedHeaders = ["w1-access-token", "w1-refresh-token", "set-cookie"];
if (!corsOrigin) {
  app.use(
    cors({
      origin: (o, cb) => cb(null, true),
      credentials: true,
      exposedHeaders,
    }),
  );
} else {
  const origins = [corsOrigin];
  const corsLocalPortStart = 5170;
  const corsLocalPortEnd = 5190;
  for (let prtNbr = corsLocalPortStart; prtNbr <= corsLocalPortEnd; prtNbr++) {
    origins.push(`http://localhost:${prtNbr}`);
  }
  app.use(cors({ origin: origins, credentials: true, exposedHeaders }));
}

app.use(
  express.json({
    limit: "5mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true }));

const isLocal = process.env.NODE_ENV == "development";

app.use((req, res, next) => {
  req.appVersion = version;
  next();
});

app.use(requestIdStamper);
app.use(boolQueryParser);

app.use(sessionRouter);

app.use("/verification-services", verificationServicesRouter);
app.use("", socialLoginRouter);

app.use("", edgeRouter);

const {
  // main Database Crud Object Rest Api Routers
  userRouter,
} = require("restLayer");

app.use("", userRouter);

// swagger

const serviceUrl = process.env.SERVICE_URL;
let serverDescription = "Development Server";
if (process.env.NODE_ENV == "production") {
  serverDescription = "Production Server";
}

swaggerDocument.servers = [
  {
    url: serviceUrl,
    description: serverDescription,
  },
];

const forwardSwagger = async (req, res, next) => {
  // swagger has a bug when the microservice url has a path suffix
  // it only works when there is a trailing slash
  if (
    req.originalUrl.endsWith("/swagger") ||
    req.originalUrl.endsWith("/swagger/index.html")
  ) {
    res.redirect(serviceUrl + "/swagger/");
    return;
  }
  req.swaggerDoc = swaggerDocument;
  next();
};

// Add api face to the app
apiFace(app);

app.use(
  "/swagger",
  forwardSwagger,
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument),
);

app.get("/favicon.ico", (req, res) => {
  const iconUrl = "https://mindbricks.com/favicon.ico";
  res.redirect(iconUrl);
});

app.get("/getPostmanCollection", (req, res) => {
  const filePath = path.join(__dirname, "w-auth-postman-collection.json");
  console.log("Downloading Postman Collection from:", filePath);
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="w-auth-postman-collection.json"',
  );

  res.download(filePath);
});

const loadMenu = (req) => {
  const fs = require("fs");
  const loginInfo = req.session
    ? `<p id="loginInfo">Logged in as: ${req.session.email} \n <a href="#" onclick="logout()">Logout</a></p>`
    : `<p>-- No login found --</p>`;
  const data = fs.readFileSync(path.join(__dirname, "welcome.html"), "utf8");
  return data.replace("$loginInfo", loginInfo);
};

app.get("/*name", (req, res) => {
  const result = loadMenu(req);
  res.setHeader("Content-Type", "text/html");
  res.send(result);
});

app.get("/", (req, res) => {
  const result = loadMenu(req);
  res.setHeader("Content-Type", "text/html");
  res.send(result);
});

app.use(errorHandler);

module.exports = app;
