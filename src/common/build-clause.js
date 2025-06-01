const { Op } = require("sequelize");

class ElasticQueryBuilder {
  constructor(prop, op, value) {
    this.prop = prop;
    this.op = op;
    this.value = value;
  }
  build() {
    return {};
  }
}

class ElasticMatchBuilder extends ElasticQueryBuilder {
  constructor(prop, op, value) {
    super(prop, op, value);
  }
  build() {
    return { term: { [this.prop]: this.value } };
  }
}

class ElasticInBuilder extends ElasticQueryBuilder {
  constructor(prop, op, value) {
    super(prop, op, value);
  }
  build() {
    return { terms: { [this.prop]: this.value } };
  }
}

class ElasticOverlapBuilder extends ElasticQueryBuilder {
  constructor(prop, op, value) {
    super(prop, op, value);
  }
  build() {
    return { terms: { [this.prop]: this.value } };
  }
}

class ElasticNotInBuilder extends ElasticQueryBuilder {
  constructor(prop, op, value) {
    super(prop, op, value);
  }
  build() {
    const match = new ElasticInBuilder(this.prop, "in", this.value).build();
    return { bool: { must_not: match } };
  }
}

class ElasticNotBuilder extends ElasticQueryBuilder {
  constructor(prop, op, value) {
    super(prop, op, value);
  }
  build() {
    const match = new ElasticMatchBuilder(this.prop, "eq", this.value).build();
    return { bool: { must_not: match } };
  }
}

class ElasticRangeBuilder extends ElasticQueryBuilder {
  constructor(prop, op, value) {
    super(prop, op, value);
  }
  build() {
    return { range: { [this.prop]: { [this.op]: this.value } } };
  }
}

class ElasticNullBuilder extends ElasticQueryBuilder {
  constructor(prop) {
    super(prop, "", "");
  }
  build() {
    return { bool: { must_not: { exists: { field: this.prop } } } };
  }
}

class ElasticExistsBuilder extends ElasticQueryBuilder {
  constructor(prop) {
    super(prop, "", "");
  }
  build() {
    return { exists: { field: this.prop } };
  }
}

const ElasticQueryBuilders = {
  eq: ElasticMatchBuilder,
  neq: ElasticNotBuilder,
  in: ElasticInBuilder,
  nin: ElasticNotInBuilder,
  lt: ElasticRangeBuilder,
  gt: ElasticRangeBuilder,
  lte: ElasticRangeBuilder,
  gte: ElasticRangeBuilder,
  overlap: ElasticOverlapBuilder,
};

const buildSequelizeClause = (name, op, value, boolValue) => {
  let sOp = null;

  if (op == "nin") {
    sOp = Op.notIn;
  } else if (op == "neq") {
    sOp = Op.ne;
  } else if (op == "contains") {
    sOp = Op.contains;
    value = [value];
  } else {
    sOp = Op[op];
  }

  return boolValue
    ? { [name]: { [sOp]: value } }
    : { [Op.not]: { [name]: { [sOp]: value } } };
};

const buildMongooseClause = (name, op, value, boolValue) => {
  const mOp = "$" + op;

  return boolValue
    ? { [name]: { [mOp]: value } }
    : { [name]: { $not: { [mOp]: value } } };
};

const buildElasticClause = (name, op, value, boolValue) => {
  let ElasticQueryBuilder = ElasticQueryBuilders[op];
  let notOp = !boolValue;
  if (op == "eq" && value == "null") {
    ElasticQueryBuilder = boolValue ? ElasticNullBuilder : ElasticExistsBuilder;
    notOp = false;
  }
  if (op == "neq" && value == "null") {
    ElasticQueryBuilder = boolValue ? ElasticExistsBuilder : ElasticNullBuilder;
    notOp = false;
  }

  if (ElasticQueryBuilder == ElasticMatchBuilder && !boolValue) {
    ElasticQueryBuilder = ElasticNotBuilder;
    notOp = false;
  }

  if (!ElasticQueryBuilder) {
    ElasticQueryBuilder = boolValue ? ElasticMatchBuilder : ElasticNotBuilder;
    notOp = false;
  }

  const query = new ElasticQueryBuilder(name, op, value).build();

  return notOp ? { bool: { must_not: query } } : query;
};

module.exports = {
  buildSequelizeClause,
  buildMongooseClause,
  buildElasticClause,
};
