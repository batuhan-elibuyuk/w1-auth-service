const { redisClient, setRedisData, getRedisData } = require("./redis");
class EntityCache {
  constructor(entityName, indexFields) {
    this.entityName = entityName;
    this.indexFields = indexFields;
    this.defaultId = null;
  }

  #buildKey(entityId) {
    return "ecache:" + this.entityName + ":" + entityId;
  }

  #buildIndexListKey(entityId) {
    return "ecache:entityKeys:" + this.entityName + ":" + entityId;
  }

  #buildIndexKey(indexField, indexValue) {
    return "ecache:" + this.entityName + "-by-" + indexField + ":" + indexValue;
  }

  async #writeObjectToRedis(data) {
    const key = this.#buildKey(data.id);
    await setRedisData(key, data);
  }

  async #readObjectFromRedis(entityId) {
    const key = this.#buildKey(entityId);
    const data = await getRedisData(key);
    return data;
  }

  async #writeIndexFields(entity) {
    const indexListKey = this.#buildIndexListKey(entity.id);
    for (const indexField of this.indexFields) {
      const index = entity[indexField];
      if (index) {
        const lKey = this.#buildIndexKey(
          indexField,
          entity[indexField].toString(),
        );
        redisClient.sAdd(lKey, entity.id);
        redisClient.sAdd(indexListKey, lKey);
      }
    }
  }

  async saveEntityToCache(entity) {
    await this.delEntityFromCache(entity.id);
    if (entity.isActive != null && entity.isActive == false) return 0;
    const result = await this.#writeObjectToRedis(entity);
    await this.#writeIndexFields(entity);
    return result;
  }

  async delEntityFromCache(entityId) {
    try {
      if (!entityId) entityId = this.defaultId;

      const key = this.#buildKey(entityId);
      await redisClient.del(key);

      const indexListKey = this.#buildIndexListKey(entityId);
      const indexKeys = await redisClient.sMembers(indexListKey);
      await redisClient.del(indexListKey);

      const commands = [];
      for (const indexKey of indexKeys) {
        commands.push(redisClient.sRem(indexKey, entityId));
      }
      await Promise.all(commands);
    } catch (error) {
      console.error("Error deleting entity from cache:", error.message);
    }
  }

  async getEntityFromCache(entityId) {
    if (!entityId) entityId = this.defaultId;
    const entityData = await this.#readObjectFromRedis(entityId);
    if (!entityData || Object.keys(entityData).length == 0) return null;
    return entityData;
  }

  async selectEntityFromCache(query) {
    const indices = [];
    for (const qName of Object.keys(query)) {
      const qValue = query[qName];
      const indexKey = this.#buildIndexKey(qName, qValue.toString());
      indices.push(indexKey);
    }
    const idList = await redisClient.sInter(indices);
    const commands = [];
    for (const id of idList) {
      commands.push(this.getEntityFromCache(id));
    }
    const entities = await Promise.all(commands);
    const result = entities.filter((entity) => entity != null);

    return result;
  }
}

module.exports = EntityCache;
