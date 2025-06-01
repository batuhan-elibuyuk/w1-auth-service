const { elasticClient } = require("./elastic");
const { redisClient, getRedisData, setRedisData } = require("./redis");
const crypto = require("crypto");

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

class ElasticIndexer {
  constructor(indexName, options) {
    this.indexName = indexName.toLowerCase();
    this.mapping = options?.mapping;
    this.createEventName = "elastic-index-" + this.indexName + "-created";
    this.updateEventName = "elastic-index-" + this.indexName + "-updated";
    this.deleteEventName = "elastic-index-" + this.indexName + "-deleted";
    this.extendEventName = "elastic-index-" + this.indexName + "-extended";
    this.isSilent = options?.isSilent ?? false;
  }

  async publishEvent(eventName, data) {}

  async logResult(logType, subject, params, location, data) {}

  async checkIndex() {
    try {
      const exists = await elasticClient.indices.exists(
        {
          index: this.indexName,
        },
        { signal: new AbortController().signal },
      );
      return exists;
    } catch (err) {
      return false;
    }
  }

  async updateMapping(properties) {
    try {
      if (!(await this.checkIndex())) {
        await elasticClient.indices.create(
          {
            index: this.indexName,
          },
          { signal: new AbortController().signal },
        );
      }
      const result = await elasticClient.indices.putMapping(
        {
          index: this.indexName,
          properties: properties,
        },
        { signal: new AbortController().signal },
      );
      await this.deleteRedisCache();
      return result;
    } catch (err) {
      console.log(
        "Index map cant be updated in elasticsearch ->",
        this.indexName,
        err.message,
      );
    }
  }

  async indexBulkData(dataItems) {
    try {
      const operations = dataItems.flatMap((doc) => [
        { index: { _index: this.indexName, _id: doc.id } },
        doc,
      ]);

      if (this.mapping && !this.checkIndex) {
        this.updateMapping(this.mapping);
      }

      const bulkResponse = await elasticClient.bulk(
        {
          refresh: true,
          operations,
        },
        { signal: new AbortController().signal },
      );

      if (bulkResponse.errors) {
        const erroredDocuments = [];
        // The items array has the same order of the dataset we just indexed.
        // The presence of the `error` key indicates that the operation
        // that we did for the document has failed.
        bulkResponse.items.forEach((action, i) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              // If the status is 429 it means that you can retry the document,
              // otherwise it's very likely a mapping error, and you should
              // fix the document before to try it again.
              status: action[operation].status,
              error: action[operation].error,
              operation: operations[i * 2],
              document: operations[i * 2 + 1],
            });
          }
        });
        console.log(
          "Some data items cant be indexed to elasticsearch in bulk indexing ->",
          erroredDocuments.length,
        );
      }
      console.log(
        this.indexName +
          " bulk index completed " +
          dataItems.length +
          (bulkResponse.errors ? " with some errors" : ""),
      );
    } catch (err) {
      console.log("Data cant be bulk indexed to elasticsearch->", err.message);
    }
  }

  async indexData(data, uniqueField) {
    if (!data) {
      console.log(
        "Null data indexing error when indexing Data to elasticsearch ->",
        this.indexName,
      );
      return;
    }
    try {
      if (this.mapping && !this.checkIndex) {
        this.updateMapping(this.mapping);
      }

      let cData = null;
      if (await this.checkIndex()) {
        try {
          const document = await elasticClient.get(
            {
              index: this.indexName,
              id: data.id,
            },
            { signal: new AbortController().signal },
          );
          if (document && document.found && document._source)
            cData = document._source;
        } catch (err) {}

        if (uniqueField) {
          // if there is a unique field, we need to delete the old data which have the same value with data
          // but we should retain cData which is equel to the given id, because it will be updated
          const query = {
            term: {
              [uniqueField]: data[uniqueField],
            },
          };
          try {
            const document = await elasticClient.search(
              {
                index: this.indexName,
                query: query,
              },
              { signal: new AbortController().signal },
            );
            if (document && document.hits && document.hits.hits) {
              for (const hit of document.hits.hits) {
                if (hit._id != data.id) {
                  await elasticClient.delete(
                    {
                      index: this.indexName,
                      id: hit._id,
                      refresh: true,
                    },
                    { signal: new AbortController().signal },
                  );
                }
              }
            }
          } catch (err) {}
        }
      }
      const isCreated = cData == null;

      const indexName = this.indexName;
      await elasticClient.index(
        {
          index: indexName,
          id: data.id,
          body: data,
          refresh: true,
        },
        { signal: new AbortController().signal },
      );
      if (!this.isSilent) {
        const eventName = isCreated
          ? this.createEventName
          : this.updateEventName;
        const res = await this.publishEvent(eventName, data);
        await this.deleteRedisCache();
      }
      console.log(this.indexName + " indexed by id " + data.id);
    } catch (err) {
      console.log("Data cant be indexed to elasticsearch ->", err.message);
    }
  }

  async deleteData(id) {
    try {
      const cData = (await this.checkIndex())
        ? await this.getDataById(id)
        : null;

      await elasticClient.delete(
        {
          index: this.indexName,
          id: id,
          refresh: true,
        },
        { signal: new AbortController().signal },
      );
      if (!this.isSilent) {
        const res = await this.publishEvent(this.deleteEventName, cData);
        await this.deleteRedisCache();
      }
      console.log(this.indexName + " document is deleted by id " + id);
    } catch (err) {
      console.log("Can not delete elasticsearch document ->", err.message);
    }
  }

  async getDataById(id) {
    try {
      if (Array.isArray(id)) {
        if (!id.length) return [];
        const document = await elasticClient.mget(
          {
            index: this.indexName,
            ids: id,
          },
          { signal: new AbortController().signal },
        );

        if (document && document.docs) {
          const result = document.docs.map((doc) => doc._source);
          return result;
        }
      } else {
        const document = await elasticClient.get(
          {
            index: this.indexName,
            id: id,
          },
          { signal: new AbortController().signal },
        );
        if (document && document.found && document._source)
          return document._source;
      }

      return null;
    } catch (err) {
      console.log(
        `Can not get elasticsearch document for ${this.indexName} index for id: ${id} ->`,
        err.message,
      );
      return null;
    }
  }

  async clearIndex() {
    try {
      await elasticClient.deleteByQuery(
        {
          index: this.indexName,
          query: {
            match_all: {},
          },
        },
        { signal: new AbortController().signal },
      );
      await this.deleteRedisCache();
    } catch (err) {
      console.log("Can not clear elasticsearch index ->", err.message);
    }
  }

  async deleteByQuery(query) {
    try {
      await elasticClient.deleteByQuery(
        {
          index: this.indexName,
          query,
        },
        { signal: new AbortController().signal },
      );
      await this.deleteRedisCache();
    } catch (err) {
      console.log(
        "Can not delete elasticsearch documents by query ->",
        err.message,
      );
    }
  }

  async getOne(query) {
    try {
      if (!query) return null;
      let result = [];
      const document = await elasticClient.search(
        {
          index: this.indexName,
          from: 0,
          size: 10,
          query: query,
        },
        { signal: new AbortController().signal },
      );
      if (document && document.hits && document.hits.hits) {
        result = document.hits.hits.map((source) => source._source);
      }
      return result.length ? result[0] : null;
    } catch (err) {
      console.log("Can not get one elasticsearch document ->", err.message);
      return null;
    }
  }

  async getAggregations(query) {
    try {
      if (!query) return null;
      let result = [];
      const document = await elasticClient.search(
        {
          index: this.indexName,
          size: 0,
          body: query,
        },
        { signal: new AbortController().signal },
      );
      //console.log("getAggregations => ",document?.aggregations );
      return document && document.aggregations ? document.aggregations : null;
    } catch (err) {
      console.log("Can not get elasticsearch aggregations ->", err.message);
      console.log("query -> ", query);
      return null;
    }
  }

  getRedisKey(from, size, query) {
    return (
      "elasticCache:" +
      this.indexName +
      ":" +
      crypto
        .createHash("sha1")
        .update(JSON.stringify({ query, from, size }))
        .digest("hex")
    );
  }

  async getFromRedis(queryKey) {
    try {
      const redisData = await getRedisData(queryKey);
      if (redisData) return JSON.parse(redisData);
    } catch (err) {}
    return null;
  }

  async setToRedis(queryKey, data) {
    try {
      await setRedisData(queryKey, data, 5 * 60);
    } catch (err) {}
  }

  async deleteRedisCache() {
    let result = 0;
    try {
      for await (const key of redisClient.scanIterator({
        MATCH: "elasticCache:" + this.indexName + ":*",
      })) {
        if (!key) continue;
        if (Array.isArray(key) && !key.length) continue;
        await redisClient.del(key);
        result = result + Array.isArray(key) ? key.length : 1;
      }
      if (result) {
        console.log(
          result +
            " keys are deleted from redis elasticCache:" +
            this.indexName,
        );
      }
    } catch (err) {
      console.log(
        "Can not delete redis cache for elasticCache:" + this.indexName,
        err.message,
      );
    }

    return result;
  }

  async getCount(query) {
    try {
      const document = await elasticClient.count(
        {
          index: this.indexName,
          body: query,
        },
        { signal: new AbortController().signal },
      );
      return document.count;
    } catch (err) {
      console.log("Can not get elasticsearch count ->", err.message);
      return 0;
    }
  }

  async getDataByPage(from, size, query, sort, cached) {
    try {
      let result = null;
      if (!query)
        query = {
          match_all: { boost: 1.2 },
        };

      const queryKey = cached ? this.getRedisKey(from, size, query) : null;
      result = queryKey ? await this.getFromRedis(queryKey) : null;
      if (result) return result;

      const document = await elasticClient.search(
        {
          index: this.indexName,
          sort: sort ?? [],
          from: from,
          size: size,
          query: query,
        },
        { signal: new AbortController().signal },
      );

      if (document && document.hits && document.hits.hits) {
        result = document.hits.hits.map((source) => source._source);
      }
      if (result && cached) {
        await this.setToRedis(queryKey, result);
      }
      return result ?? [];
    } catch (err) {
      console.log(
        "Can not get elasticsearch documents by page ->",
        err.message,
      );
      return [];
    }
  }

  async updateIndex(query, script, params, retries) {
    try {
      if (!retries) retries = 1;
      if (this.mapping && !this.checkIndex) {
        this.updateMapping(this.mapping);
      }
      const result = await elasticClient.updateByQuery(
        {
          index: this.indexName,
          query: query,
          script: { params: params, source: script },
          conflicts: "proceed",
          refresh: true,
        },
        { signal: new AbortController().signal },
      );
      if (result.version_conflicts) {
        if (retries < 25) {
          retries++;
          await delay(50);
          return await this.updateIndex(query, script, params, retries);
        } else {
          console.log(
            this.indexName + " version conflict in update by query:",
            JSON.stringify(query),
            JSON.stringify(script),
          );
          return result;
        }
      }
      console.log(this.indexName + " updated by query");
      await this.deleteRedisCache();
      return result;
    } catch (err) {
      console.log(
        "Can not update elasticsearch index by query ->",
        err.message,
        JSON.stringify(query),
      );
    }
  }
}

module.exports = ElasticIndexer;
