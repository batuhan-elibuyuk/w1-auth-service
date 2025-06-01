const { NotAuthenticatedError } = require("common");
const { sendMail } = require("edgeFunctions");

const sendMailRestController = async (req, res, next) => {
  try {
    const statusCode = 201;
    const result = await sendMail(req);
    result.statusCode = result.status ?? statusCode;
    if (result.headers) {
      for (const [headerName, headerValue] of Object.entries(result.headers)) {
        res.set(headerName, headerValue);
      }
    }
    res
      .status(result.statusCode)
      .send(result.content ?? result.message ?? result);
  } catch (err) {
    console.error("Error running routeService for sendMail: ", err);
    return next(err);
  }
};

module.exports = sendMailRestController;
