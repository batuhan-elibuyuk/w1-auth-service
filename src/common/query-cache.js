const { redisClient, getRedisData, setRedisData } = require("./redis");
const crypto = require("crypto");

class QueryCache {
  constructor(entityName, clusters, andOp, eqOp, input, wClause) {
    this.entityName = entityName;
    this.clusters = clusters;
    this.input = input;
    this.whereClause = wClause;
    this.andOp = andOp; //"$and"
    this.eqOp = eqOp;
    this._queryKey = null;
    this.#buildKey();
  }

  get queryKey() {
    return this._queryKey;
  }

  #findPropInArray(propName, props) {
    for (const propObj of props) {
      if (propObj) {
        if (propObj[propName]) return propObj[propName];
        if (propObj[this.andOp])
          return this.#findPropInArray(propName, propObj[this.andOp]);
      }
    }
    return null;
  }

  #buildClusterKey() {
    let clusterKey = "";
    for (const clusterProp of this.clusters) {
      let clusterValue = this.whereClause
        ? this.whereClause[clusterProp]
        : null;

      if (!clusterValue && this.whereClause && this.whereClause[this.andOp]) {
        clusterValue = this.#findPropInArray(
          clusterProp,
          this.whereClause[this.andOp],
        );
      }

      const isObject =
        clusterValue &&
        typeof clusterValue === "object" &&
        !Array.isArray(clusterValue);

      if (isObject) clusterValue = clusterValue[this.eqOp];

      if (clusterKey != "") clusterKey += ":";

      if (clusterValue) {
        clusterKey += clusterValue;
      } else {
        clusterKey += "all";
      }
    }
    if (clusterKey != "") return "c:" + clusterKey;
    return "c";
  }

  #buildKey() {
    const clusterKey = this.#buildClusterKey();
    this._queryKey =
      "qcache:" +
      this.entityName +
      ":" +
      clusterKey +
      ":" +
      crypto
        .createHash("sha1")
        .update(JSON.stringify(this.input))
        .digest("hex");
  }

  async #writeData(data, expire) {
    await setRedisData(this._queryKey, data, expire);
  }

  async #readData() {
    const cacheValue = await getRedisData(this._queryKey);
    return cacheValue != "" ? cacheValue : null;
  }

  async writeQueryResult(data, expire) {
    await this.#writeData(JSON.stringify(data), expire);
  }

  async readQueryResult() {
    const result = await this.#readData();
    if (result) return JSON.parse(result);
    return null;
  }
}

class QueryCacheInvalidator {
  constructor(entityName, clusters) {
    this.entityName = entityName;
    this.clusters = clusters;
  }

  #delDataFromCacheByKeyPattern = async (keyPattern) => {
    let result = 0;
    try {
      for await (const key of redisClient.scanIterator({
        MATCH: keyPattern,
      })) {
        await redisClient.del(key);
        result++;
      }
    } catch (error) {
      console.error("Error deleting keys In QueryCache:", error.message);
    }

    return result;
  };

  clusterCombinations(root, idx, entity, combinations) {
    if (root) root = root + ":";
    const nroot1 = root ?? "" + "all";
    const value = entity[this.clusters[idx]];
    const nroot2 = value ? (root ?? "" + value.toString()) : null;

    if (idx == this.clusters.length - 1) {
      combinations.push("c:" + nroot1);
      if (nroot2) combinations.push("c:" + nroot2);
    } else {
      this.clusterCombinations(nroot1, idx + 1, entity, combinations);
      this.clusterCombinations(nroot2, idx + 1, entity, combinations);
    }
  }

  async invalidateCache(entity) {
    const combinations = [];

    if (this.clusters.length == 0) {
      combinations.push("c");
    } else {
      this.clusterCombinations(null, 0, entity, combinations);
    }
    return await this.#deleteClusters(combinations);
  }

  async invalidateAll() {
    const keyPattern = "qcache:" + this.entityName + ":*";
    return await this.#delDataFromCacheByKeyPattern(keyPattern);
  }

  async #deleteClusters(combinations) {
    for (const cluster of combinations) {
      const keyPattern = "qcache:" + this.entityName + ":" + cluster + "*";
      await this.#delDataFromCacheByKeyPattern(keyPattern);
    }
  }
}

module.exports = { QueryCache, QueryCacheInvalidator };
