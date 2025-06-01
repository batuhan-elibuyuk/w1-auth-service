const { expect } = require("chai");
const {
  buildSequelizeClause,
  buildMongooseClause,
  buildElasticClause,
} = require("../../src/common");
const { Op } = require("sequelize");

describe("Clause Builder - buildSequelizeClause", () => {
  it("should build a simple Op.eq clause when boolValue is true", () => {
    const result = buildSequelizeClause("age", "eq", 30, true);
    expect(result).to.deep.equal({ age: { [Op.eq]: 30 } });
  });

  it("should build a negated clause when boolValue is false", () => {
    const result = buildSequelizeClause("age", "eq", 30, false);
    expect(result).to.deep.equal({ [Op.not]: { age: { [Op.eq]: 30 } } });
  });

  it("should handle 'nin' as Op.notIn", () => {
    const result = buildSequelizeClause("status", "nin", ["A", "B"], true);
    expect(result).to.deep.equal({ status: { [Op.notIn]: ["A", "B"] } });
  });

  it("should handle 'neq' as Op.ne", () => {
    const result = buildSequelizeClause("status", "neq", "done", true);
    expect(result).to.deep.equal({ status: { [Op.ne]: "done" } });
  });

  it("should handle 'contains' with value wrapped in array", () => {
    const result = buildSequelizeClause("tags", "contains", "urgent", true);
    expect(result).to.deep.equal({ tags: { [Op.contains]: ["urgent"] } });
  });

  it("should fallback to Op.gte for supported Sequelize operator", () => {
    const result = buildSequelizeClause("price", "gte", 100, true);
    expect(result).to.deep.equal({ price: { [Op.gte]: 100 } });
  });

  it("should wrap value in array only if not already array for contains", () => {
    const result = buildSequelizeClause("tags", "contains", ["urgent"], true);
    expect(result).to.deep.equal({ tags: { [Op.contains]: ["urgent"] } });
  });

  it("should return undefined operator for unknown Sequelize op", () => {
    const result = buildSequelizeClause("age", "xyz", 10, true);
    expect(result).to.deep.equal({ age: { undefined: 10 } });
  });

  it("should handle non-string op gracefully in Sequelize clause", () => {
    const result = buildSequelizeClause("age", null, 30, true);
    expect(result).to.deep.equal({ age: { undefined: 30 } }); // Op[null] returns undefined
  });

  it("should return undefined clause when all inputs are null in Sequelize", () => {
    const result = buildSequelizeClause(null, null, null, true);
    expect(result).to.deep.equal({ null: { undefined: null } });
  });
});

describe("Clause Builder - buildMongooseClause", () => {
  it("should build standard positive clause", () => {
    const result = buildMongooseClause("age", "eq", 25, true);
    expect(result).to.deep.equal({ age: { $eq: 25 } });
  });

  it("should build negated clause when boolValue is false", () => {
    const result = buildMongooseClause("age", "eq", 25, false);
    expect(result).to.deep.equal({ age: { $not: { $eq: 25 } } });
  });

  it("should still build valid clause for unsupported op (e.g. 'foo')", () => {
    const result = buildMongooseClause("custom", "foo", 42, true);
    expect(result).to.deep.equal({ custom: { $foo: 42 } });
  });

  it("should build negated clause for unknown Mongoose op", () => {
    const result = buildMongooseClause("custom", "foo", 42, false);
    expect(result).to.deep.equal({
      custom: { $not: { $foo: 42 } },
    });
  });

  it("should handle object value in Mongoose", () => {
    const value = { a: 1 };
    const result = buildMongooseClause("meta", "eq", value, true);
    expect(result).to.deep.equal({ meta: { $eq: value } });
  });
});

describe("Clause Builder - buildElasticClause", () => {
  it("should build simple match query for eq", () => {
    const result = buildElasticClause("status", "eq", "active", true);
    expect(result).to.deep.equal({ term: { status: "active" } });
  });

  it("should negate eq match with must_not when boolValue is false", () => {
    const result = buildElasticClause("status", "eq", "active", false);
    expect(result).to.deep.equal({
      bool: { must_not: { term: { status: "active" } } },
    });
  });

  it("should build exists query for neq null", () => {
    const result = buildElasticClause("email", "neq", "null", true);
    expect(result).to.deep.equal({ exists: { field: "email" } });
  });

  it("should build not exists query for eq null", () => {
    const result = buildElasticClause("email", "eq", "null", true);
    expect(result).to.deep.equal({
      bool: { must_not: { exists: { field: "email" } } },
    });
  });

  it("should build range clause for gt", () => {
    const result = buildElasticClause("age", "gt", 30, true);
    expect(result).to.deep.equal({ range: { age: { gt: 30 } } });
  });

  it("should handle unknown op with default match", () => {
    const result = buildElasticClause("role", "customOp", "admin", true);
    expect(result).to.deep.equal({ term: { role: "admin" } });
  });

  it("should handle unknown op with must_not when boolValue false", () => {
    const result = buildElasticClause("role", "customOp", "admin", false);
    expect(result).to.deep.equal({
      bool: { must_not: { term: { role: "admin" } } },
    });
  });

  it("should fallback to ElasticMatchBuilder for supported op like 'eq' when ElasticQueryBuilders[op] is defined", () => {
    const result = buildElasticClause("level", "eq", "info", true);
    expect(result).to.deep.equal({ term: { level: "info" } });
  });

  it("should fallback to default clause builder if op is unknown and boolValue is true", () => {
    const result = buildElasticClause("customField", "foo", "bar", true);
    expect(result).to.deep.equal({ term: { customField: "bar" } });
  });

  it("should fallback to negated default clause if op is unknown and boolValue is false", () => {
    const result = buildElasticClause("customField", "foo", "bar", false);
    expect(result).to.deep.equal({
      bool: { must_not: { term: { customField: "bar" } } },
    });
  });

  it("should use ElasticInBuilder for 'in' operation", () => {
    const result = buildElasticClause("tags", "in", ["a", "b"], true);
    expect(result).to.deep.equal({ terms: { tags: ["a", "b"] } });
  });

  it("should use ElasticOverlapBuilder for 'overlap'", () => {
    const result = buildElasticClause("roles", "overlap", ["admin"], true);
    expect(result).to.deep.equal({ terms: { roles: ["admin"] } });
  });

  it("should use ElasticNotInBuilder and return must_not clause", () => {
    const result = buildElasticClause("tags", "nin", ["a"], true);
    expect(result).to.deep.equal({
      bool: { must_not: { terms: { tags: ["a"] } } },
    });
  });

  it("should handle 'neq' null with boolValue false", () => {
    const result = buildElasticClause("email", "neq", "null", false);
    expect(result).to.deep.equal({
      bool: { must_not: { exists: { field: "email" } } },
    });
  });

  it("should fallback to default in Elastic clause when op is null", () => {
    const result = buildElasticClause("field", null, "val", true);
    expect(result).to.deep.equal({ term: { field: "val" } });
  });

  it("should handle empty field name in Elastic clause", () => {
    const result = buildElasticClause("", "eq", "val", true);
    expect(result).to.deep.equal({ term: { "": "val" } });
  });
});
