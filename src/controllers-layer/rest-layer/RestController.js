const { hexaLogger } = require("common");

class RestController {
  constructor(name, routeName, req, res, next) {
    this.name = name;
    this.routeName = routeName;
    this.apiManager = null;
    this.response = {};
    this.businessOutput = null;
    this.crudType = "get";
    this.status = 200;
    this.dataName = "resData";
    this._req = req;
    this._res = res;
    this._next = next;
    this.requestId = req.requestId;
    this.redirectUrl = null;
  }

  async createApiManager() {}

  async redirect() {
    if (this.redirectUrl || this.apiManager.redirectUrl)
      return this._res.redirect(
        this.apiManager.redirectUrl ?? this.redirectUrl,
      );
    return false;
  }

  async doDownload() {
    return await this.apiManager.doDownload(this._res);
  }

  async _logManagerCreateError(err) {
    hexaLogger.insertError(
      "RestRequestManagerCreateError",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      err,
      this.requestId,
    );
  }

  async _logRequest() {
    hexaLogger.insertInfo(
      "RestRequestReceived",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      {
        method: this._req.method,
        url: this._req.url,
        body: this._req.body,
        query: this._req.query,
        params: this._req.params,
        headers: this._req.headers,
      },
      this.requestId,
    );
  }

  async _logResponse() {
    hexaLogger.insertInfo(
      "RestRequestResponded",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      this.response,
      this.requestId,
    );
  }

  async _logError(err) {
    hexaLogger.insertError(
      "ErrorInRestRequest",
      { function: this.name, err: err.message },
      `${this.routeName}.js->${this.name}`,
      err,
      this.requestId,
    );
  }

  async processRequest() {
    await this._logRequest();

    try {
      this.apiManager = await this.createApiManager(this._req);
    } catch (err) {
      await this._logManagerCreateError(err);
      return this._next(err);
    }

    this.startTime = Date.now();

    try {
      this.response = await this.apiManager.execute();
      this.response.httpStatus = this.status;

      if (this.apiManager.setCookie) {
        this._res.cookie(
          this.apiManager.setCookie.cookieName,
          this.apiManager.setCookie.cookieValue,
          {
            httpOnly: true,
            domain: process.env.COOKIE_URL,
            sameSite: "None",
            secure: true,
          },
        );
      }

      if (!(await this.redirect()) && !(await this.doDownload())) {
        this._res.status(this.status).send(this.response);
      }

      await this._logResponse();
    } catch (err) {
      //await this._logError(err);
      return this._next(err);
    }
  }
}

module.exports = RestController;
