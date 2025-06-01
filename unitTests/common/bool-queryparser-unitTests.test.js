const { expect } = require("chai");
const { boolQueryParser } = require("../../src/common");

describe("boolQueryParser Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {} };
    res = {};
    next = () => {};
  });

  it("should convert 'true' string to boolean true", () => {
    req.query = { isActive: "true" };
    boolQueryParser(req, res, next);
    expect(req.query.isActive).to.equal(true);
  });

  it("should convert 'false' string to boolean false", () => {
    req.query = { isVerified: "false" };
    boolQueryParser(req, res, next);
    expect(req.query.isVerified).to.equal(false);
  });

  it("should handle multiple boolean and non-boolean values", () => {
    req.query = {
      admin: "true",
      active: "false",
      age: "25",
      name: "Jane",
    };
    boolQueryParser(req, res, next);
    expect(req.query).to.deep.equal({
      admin: true,
      active: false,
      age: "25",
      name: "Jane",
    });
  });

  it("should not modify values that are not 'true' or 'false'", () => {
    req.query = { name: "Alice", city: "Istanbul" };
    boolQueryParser(req, res, next);
    expect(req.query).to.deep.equal({ name: "Alice", city: "Istanbul" });
  });

  it("should leave query unchanged if no query parameters", () => {
    req.query = {};
    boolQueryParser(req, res, next);
    expect(req.query).to.deep.equal({});
  });

  it("should do nothing if req.query is undefined", () => {
    req.query = undefined;
    expect(() => boolQueryParser(req, res, next)).to.not.throw();
  });
});
