const { expect } = require("chai");
const sinon = require("sinon");
const { requestIdStamper } = require("../../src/common/");

describe("requestIdStamper Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
    };
    res = {};
    next = sinon.spy();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should generate a new requestId if none is provided", async () => {
    await requestIdStamper(req, res, next);

    expect(req.requestId).to.equal(req.ownRequestId);
    expect(next.calledOnce).to.be.true;
  });

  it("should use requestId from query parameters if provided", async () => {
    req.query.requestId = "queryRequestId456";

    await requestIdStamper(req, res, next);

    expect(req.requestId).to.equal("queryRequestId456");
    expect(next.calledOnce).to.be.true;
  });

  it("should use requestId from body if provided and query parameter is absent", async () => {
    req.body.requestId = "bodyRequestId789";

    await requestIdStamper(req, res, next);

    expect(req.requestId).to.equal("bodyRequestId789");
    expect(next.calledOnce).to.be.true;
  });

  it("should prioritize requestId from query over body", async () => {
    req.query.requestId = "queryPriorityId";
    req.body.requestId = "bodyRequestId";

    await requestIdStamper(req, res, next);

    expect(req.requestId).to.equal("queryPriorityId");
    expect(next.calledOnce).to.be.true;
  });

  it("should assign caching-related properties from query", async () => {
    req.query = {
      caching: "true",
      cacheTTL: "300",
      getJoins: "yes",
      excludeCqrs: "false",
      pageNumber: "2",
      pageRowCount: "50",
    };

    await requestIdStamper(req, res, next);

    expect(req.caching).to.equal("true");
    expect(req.cacheTTL).to.equal("300");
    expect(req.getJoins).to.equal("yes");
    expect(req.excludeCqrs).to.equal("false");
    expect(req.pageNumber).to.equal("2");
    expect(req.pageRowCount).to.equal("50");
    expect(next.calledOnce).to.be.true;
  });

  it("should not override existing req.requestId", async () => {
    req.requestId = "alreadySetId";

    await requestIdStamper(req, res, next);

    expect(req.requestId).to.equal("alreadySetId");
    expect(req.ownRequestId).to.not.equal("alreadySetId");
    expect(next.calledOnce).to.be.true;
  });

  it("should handle missing query and body gracefully", async () => {
    req = {};
    res = {};
    next = sinon.spy();

    await requestIdStamper(req, res, next);

    expect(req.requestId).to.equal(req.ownRequestId);
    expect(next.calledOnce).to.be.true;
  });
});
