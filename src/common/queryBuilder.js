const platforms = ["elastic", "sequelize", "mongodb"];
const Sequelize = require("sequelize");

class ElasticExpression {
  constructor() {
    this.expression = null;
  }
  build() {
    return null;
  }
}

class ElasticEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { term: { [this.r]: { value: this.l } } };
  }
}

class ElasticNotEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    const positiveQuery = { [this.r]: this.l };
    return { bool: { must_not: positiveQuery } };
  }
}

class ElasticGreaterThanExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { gt: this.l } } };
  }
}

class ElasticGreaterThanOrEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { gte: this.l } } };
  }
}

class ElasticLessThanExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { lt: this.l } } };
  }
}

class ElasticLessThanOrEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { lte: this.l } } };
  }
}

class ElasticInExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { terms: { [this.r]: this.l } };
  }
}

class ElasticNotInExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { terms: { [this.r]: this.l } } } };
  }
}

class ElasticLikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { wildcard: { [this.r]: this.l } };
  }
}

class ElasticILikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { wildcard: { [this.r]: this.l } };
  }
}

class ElasticNotLikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { wildcard: { [this.r]: this.l } } } };
  }
}

class ElasticNotILikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { wildcard: { [this.r]: this.l } } } };
  }
}

class ElasticIsNullExpression extends ElasticExpression {
  constructor(r) {
    super();
    this.r = r;
  }
  build() {
    return { bool: { must_not: { exists: { field: this.r } } } };
  }
}

class ElasticNotNullExpression extends ElasticExpression {
  constructor(r) {
    super();
    this.r = r;
  }
  build() {
    return { exists: { field: this.r } };
  }
}

class ElasticBetweenExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { gte: this.l[0], lte: this.l[1] } } };
  }
}

class ElasticNotBetweenExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return {
      bool: {
        must_not: { range: { [this.r]: { gte: this.l[0], lte: this.l[1] } } },
      },
    };
  }
}

class ElasticContainsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { match: { [this.r]: this.l } };
  }
}

class ElasticNotContainsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { match: { [this.r]: this.l } } } };
  }
}

class ElasticStartsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { prefix: { [this.r]: this.l } };
  }
}

class ElasticNotStartsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { prefix: { [this.r]: this.l } } } };
  }
}

class ElasticEndsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { wildcard: { [this.r]: this.l } };
  }
}

class ElasticNotEndsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { wildcard: { [this.r]: this.l } } } };
  }
}

class ElasticMatchExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { match: { [this.r]: this.l } };
  }
}

class ElasticNotMatchExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { match: { [this.r]: this.l } } } };
  }
}

class ElasticOverlapExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { match: { [this.r]: this.l } };
  }
}

class ElasticNotOverlapExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { match: { [this.r]: this.l } } } };
  }
}

class ElasticAndExpression extends ElasticExpression {
  constructor(expArray) {
    super();
    this.expArray = expArray;
  }
  build() {
    return { bool: { must: this.expArray.map((exp) => exp.build()) } };
  }
}

class ElasticOrExpression extends ElasticExpression {
  constructor(expArray) {
    super();
    this.expArray = expArray;
  }
  build() {
    return { bool: { should: this.expArray.map((exp) => exp.build()) } };
  }
}

class ElasticNotExpression extends ElasticExpression {
  constructor(exp) {
    super();
    this.exp = exp;
  }
  build() {
    return { bool: { must_not: this.exp.build() } };
  }
}

class ElasticNorExpression extends ElasticExpression {
  constructor(expArray) {
    super();
    this.expArray = expArray;
  }
  build() {
    return { bool: { must_not: this.expArray.map((exp) => exp.build()) } };
  }
}

class SequelizeEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: this.l };
  }
}

class SequelizeNotEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.ne]: this.l } };
  }
}

class SequelizeGreaterThanExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.gt]: this.l } };
  }
}

class SequelizeGreaterThanOrEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.gte]: this.l } };
  }
}

class SequelizeLessThanExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.lt]: this.l } };
  }
}

class SequelizeLessThanOrEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.lte]: this.l } };
  }
}

class SequelizeInExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.in]: this.l ?? [] } };
  }
}

class SequelizeNotInExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notIn]: this.l ?? [] } };
  }
}

class SequelizeLikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.like]: this.l } };
  }
}

class SequelizeILikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.iLike]: this.l } };
  }
}

class SequelizeNotLikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notLike]: this.l } };
  }
}

class SequelizeNotILikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notILike]: this.l } };
  }
}

class SequelizeIsNullExpression {
  constructor(r) {
    this.r = r;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.is]: null } };
  }
}

class SequelizeNotNullExpression {
  constructor(r) {
    this.r = r;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.not]: null } };
  }
}

class SequelizeBetweenExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.between]: this.l } };
  }
}

class SequelizeNotBetweenExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notBetween]: this.l } };
  }
}

class SequelizeContainsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.contains]: this.l } };
  }
}

class SequelizeNotContainsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notContains]: this.l } };
  }
}

class SequelizeStartsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.startsWith]: this.l } };
  }
}

class SequelizeNotStartsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notStartsWith]: this.l } };
  }
}

class SequelizeEndsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.endsWith]: this.l } };
  }
}

class SequelizeNotEndsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notEndsWith]: this.l } };
  }
}

class SequelizeMatchExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.match]: this.l } };
  }
}

class SequelizeNotMatchExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notMatch]: this.l } };
  }
}

class SequelizeOverlapExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.overlap]: this.l } };
  }
}

class SequelizeNotOverlapExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notOverlap]: this.l } };
  }
}

class SequelizeAndExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return { [Sequelize.Op.and]: this.expArray.map((exp) => exp.build()) };
  }
}

class SequelizeOrExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return { [Sequelize.Op.or]: this.expArray.map((exp) => exp.build()) };
  }
}

class SequelizeNotExpression {
  constructor(exp) {
    this.exp = exp;
  }
  build() {
    return { [Sequelize.Op.not]: this.exp.build() };
  }
}

class SequelizeNorExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return { [Sequelize.Op.not]: this.expArray.map((exp) => exp.build()) };
  }
}

const ElasticExpressions = {
  eq: ElasticEqualExpression,
  ne: ElasticNotEqualExpression,
  gt: ElasticGreaterThanExpression,
  gte: ElasticGreaterThanOrEqualExpression,
  lt: ElasticLessThanExpression,
  lte: ElasticLessThanOrEqualExpression,
  in: ElasticInExpression,
  nin: ElasticNotInExpression,
  like: ElasticLikeExpression,
  nlike: ElasticNotLikeExpression,
  ilike: ElasticILikeExpression,
  nilike: ElasticNotILikeExpression,
  isnull: ElasticIsNullExpression,
  notnull: ElasticNotNullExpression,
  between: ElasticBetweenExpression,
  nbetween: ElasticNotBetweenExpression,
  contains: ElasticContainsExpression,
  ncontains: ElasticNotContainsExpression,
  starts: ElasticStartsExpression,
  nstarts: ElasticNotStartsExpression,
  ends: ElasticEndsExpression,
  nends: ElasticNotEndsExpression,
  match: ElasticMatchExpression,
  nmatch: ElasticNotMatchExpression,
  overlap: ElasticOverlapExpression,
  noverlap: ElasticNotOverlapExpression,
  and: ElasticAndExpression,
  or: ElasticOrExpression,
  not: ElasticNotExpression,
  nor: ElasticNorExpression,
};

const SequelizeExpressions = {
  eq: SequelizeEqualExpression,
  ne: SequelizeNotEqualExpression,
  gt: SequelizeGreaterThanExpression,
  gte: SequelizeGreaterThanOrEqualExpression,
  lt: SequelizeLessThanExpression,
  lte: SequelizeLessThanOrEqualExpression,
  in: SequelizeInExpression,
  nin: SequelizeNotInExpression,
  like: SequelizeLikeExpression,
  nlike: SequelizeNotLikeExpression,
  ilike: SequelizeILikeExpression,
  nilike: SequelizeNotILikeExpression,
  isnull: SequelizeIsNullExpression,
  notnull: SequelizeNotNullExpression,
  between: SequelizeBetweenExpression,
  nbetween: SequelizeNotBetweenExpression,
  contains: SequelizeContainsExpression,
  ncontains: SequelizeNotContainsExpression,
  starts: SequelizeStartsExpression,
  nstarts: SequelizeNotStartsExpression,
  ends: SequelizeEndsExpression,
  nends: SequelizeNotEndsExpression,
  match: SequelizeMatchExpression,
  nmatch: SequelizeNotMatchExpression,
  overlap: SequelizeOverlapExpression,
  noverlap: SequelizeNotOverlapExpression,
  and: SequelizeAndExpression,
  or: SequelizeOrExpression,
  not: SequelizeNotExpression,
  nor: SequelizeNorExpression,
};

const MongoDbExpressions = {
  eq: (l, r) => ({ [l]: r }),
  ne: (l, r) => ({ [l]: { $ne: r } }),
  gt: (l, r) => ({ [l]: { $gt: r } }),
  gte: (l, r) => ({ [l]: { $gte: r } }),
  lt: (l, r) => ({ [l]: { $lt: r } }),
  lte: (l, r) => ({ [l]: { $lte: r } }),
  in: (l, r) => ({ [l]: { $in: r ?? [] } }),
  nin: (l, r) => ({ [l]: { $nin: r ?? [] } }),
  like: (l, r) => ({ [l]: { $regex: new RegExp(r), $options: "i" } }),
  nlike: (l, r) => ({ [l]: { $not: new RegExp(r), $options: "i" } }),
  ilike: (l, r) => ({ [l]: { $regex: new RegExp(r), $options: "i" } }),
  nilike: (l, r) => ({ [l]: { $not: new RegExp(r), $options: "i" } }),
  isnull: (r) => ({ [r]: null }),
  notnull: (r) => ({ [r]: { $ne: null } }),
  between: (r, l) => ({
    [r]: {
      $gte: l[0],
      $lte: l[1],
    },
  }),
  nbetween: (r, l) => ({
    [r]: {
      $not: {
        $gte: l[0],
        $lte: l[1],
      },
    },
  }),
  contains: (l, r) => ({ [l]: { $elemMatch: { $eq: r } } }),
  ncontains: (l, r) => ({
    [l]: { $not: { $elemMatch: { $eq: r } } },
  }),
  starts: (l, r) => ({ [l]: { $regex: new RegExp("^" + r) } }),
  nstarts: (l, r) => ({
    [l]: { $not: { $regex: new RegExp("^" + r) } },
  }),
  ends: (l, r) => ({ [l]: { $regex: new RegExp(r + "$") } }),
  nends: (l, r) => ({
    [l]: { $not: { $regex: new RegExp(r + "$") } },
  }),
  match: (l, r) => ({ [l]: { $regex: new RegExp(r) } }),
  nmatch: (l, r) => ({
    [l]: { $not: { $regex: new RegExp(r) } },
  }),
  overlap: (l, r) => ({ [l]: { $elemMatch: { $in: r } } }),
  noverlap: (l, r) => ({
    [l]: { $not: { $elemMatch: { $in: r } } },
  }),
  and: (expArray) => ({
    $and: expArray.map((exp) => exp),
  }),
  or: (expArray) => ({
    $or: expArray.map((exp) => exp),
  }),
  not: (exp) => ({
    $not: exp,
  }),
  nor: (expArray) => ({
    $nor: expArray.map((exp) => exp),
  }),
  exists: (l) => ({ [l]: { $exists: true } }),
  nexists: (l) => ({ [l]: { $exists: false } }),
  all: (l, r) => ({ [l]: { $all: r } }),
  notall: (l, r) => ({ [l]: { $not: { $all: r } } }),
  size: (l, r) => ({ [l]: { $size: r } }),
  notsize: (l, r) => ({ [l]: { $not: { $size: r } } }),
  any: (l, r) => ({ [l]: { $elemMatch: { $in: r } } }),
  notany: (l, r) => ({
    [l]: { $not: { $elemMatch: { $in: r } } },
  }),
};

convertKeyValueToQuery = (key, value, platform) => {
  if (key.startsWith("$")) {
    const op = key.slice(1);
    return new platform[op](convertToSystemQuery(value, platform));
  } else {
    let op = "eq";
    let l = key;
    let r = value;
    if (typeof value == "object") {
      op = Object.keys(value)[0].slice(1);
      r = value[Object.keys(value)[0]];
    }
    return new platform[op](l, r);
  }
};

convertToSystemQuery = (query, platform) => {
  if (Array.isArray(query)) {
    return query.map((item) => convertToSystemQuery(item, platform));
  }

  if (query == null) return query;

  if (typeof query !== "object") return query;

  if (Object.keys(query).length === 0) {
    return query;
  }

  if (Object.keys(query).length === 1) {
    const key = Object.keys(query)[0];
    const value = query[key];
    return convertKeyValueToQuery(key, value, platform);
  }

  if (Object.keys(query).length > 1) {
    let expArray = [];
    Object.keys(query).forEach((key) => {
      const value = query[key];
      expArray.push(convertKeyValueToQuery(key, value, platform));
    });
    return new platform.and(expArray);
  }
};

const convertUserQueryToElasticQuery = (userQuery) => {
  let mQuery = convertToSystemQuery(userQuery, ElasticExpressions);
  return mQuery ? mQuery.build() : null;
};

const convertUserQueryToSequelizeQuery = (userQuery) => {
  let mQuery = convertToSystemQuery(userQuery, SequelizeExpressions);
  return mQuery ? mQuery.build() : null;
};

const convertUserQueryToMongoDbQuery = (userQuery) => {
  let mQuery = convertToSystemQuery(userQuery, MongoDbExpressions);
  return mQuery;
};

module.exports = {
  convertUserQueryToElasticQuery,
  convertUserQueryToSequelizeQuery,
  convertUserQueryToMongoDbQuery,
};
