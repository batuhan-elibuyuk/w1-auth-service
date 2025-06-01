const { QueryCache, QueryCacheInvalidator } = require("common");

const { Op } = require("sequelize");

class UserQueryCache extends QueryCache {
  constructor(input, wClause) {
    super("user", [], Op.and, Op.eq, input, wClause);
  }
}
class UserQueryCacheInvalidator extends QueryCacheInvalidator {
  constructor() {
    super("user", []);
  }
}

module.exports = {
  UserQueryCache,
  UserQueryCacheInvalidator,
};
