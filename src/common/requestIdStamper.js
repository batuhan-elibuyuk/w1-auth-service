const { createHexCode } = require("./hexa-id");

const requestIdStamper = async (req, res, next) => {
  req.ownRequestId = createHexCode();
  if (!req.requestId) {
    req.requestId =
      req.query?.requestId ?? req.body?.requestId ?? req.ownRequestId;
  }

  req.caching = req.query?.caching;
  req.cacheTTL = req.query?.cacheTTL;
  req.getJoins = req.query?.getJoins;
  req.excludeCqrs = req.query?.excludeCqrs;

  req.pageNumber = req.query?.pageNumber;
  req.pageRowCount = req.query?.pageRowCount;

  next();
};

module.exports = requestIdStamper;
