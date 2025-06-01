const { NotAuthenticatedError, ForbiddenError } = require("common");
const { hexaLogger } = require("common");
const HexaAuth = require("./hexa-auth");

class WSession extends HexaAuth {
  constructor() {
    super();
    this.ROLES = {};

    this.projectName = "w";
    this.projectCodename = "w1";
    this.isJWT = true;
    this.isJWTAuthRSA = true;
    this.isRemoteAuth = false;
    this.useRemoteSession = false;
  }

  async readTenantIdFromRequest(request) {}

  async checkTokenLocations(req) {
    // implement this in project auth with the project token locations
    let sessionToken;

    sessionToken = req.query["access_token"];
    if (sessionToken) {
      console.log("Token extracted:", "query", "access_token");
      return [sessionToken, false, "query", "access_token"];
    }

    sessionToken = this.getBearerToken(req);
    if (sessionToken) {
      console.log("Token extracted:", "bearer");
      return [sessionToken, false, "bearer"];
    }

    // check if there is any header of the application
    sessionToken = req.headers["w1-access-token"];
    if (sessionToken) {
      console.log("Token extracted:", "header", "w1-access-token");
      return [sessionToken, false, "header", "w1-access-token"];
    }

    sessionToken = this.getCookieToken("w1-access-token", req);
    if (sessionToken) {
      console.log("Token extracted:", "cookie", "w1-access-token");
      this.currentCookieName = "w1-access-token";
      console.log("Cookie name:", this.currentCookieName);
      return [sessionToken, false, "cookie", "w1-access-token"];
    }

    return [];
  }
}

module.exports = WSession;
