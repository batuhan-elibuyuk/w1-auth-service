const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("ElasticIndexer", () => {
  let ElasticIndexer;
  let elasticClientMock, redisClientMock;
  let getRedisDataStub, setRedisDataStub;

  beforeEach(() => {
    elasticClientMock = {
      indices: {
        exists: sinon.stub().resolves(true),
        create: sinon.stub().resolves({ acknowledged: true }),
        putMapping: sinon.stub().resolves({ acknowledged: true }),
      },
      bulk: sinon.stub().resolves({ errors: false, items: [] }),
      index: sinon.stub().resolves(),
      get: sinon.stub().resolves({ found: true, _source: { id: "1" } }),
      delete: sinon.stub().resolves(),
      mget: sinon.stub().resolves({ docs: [{ _source: { id: "1" } }] }),
      deleteByQuery: sinon.stub().resolves(),
      search: sinon
        .stub()
        .resolves({
          hits: { hits: [{ _source: { id: 1 } }] },
          aggregations: {},
        }),
      count: sinon.stub().resolves({ count: 10 }),
      updateByQuery: sinon.stub().resolves({ version_conflicts: false }),
    };

    redisClientMock = {
      scanIterator: sinon.stub().returns([]),
      del: sinon.stub().resolves(),
    };

    getRedisDataStub = sinon.stub().resolves(null);
    setRedisDataStub = sinon.stub().resolves();

    ElasticIndexer = proxyquire("../../src/common/elastic-index", {
      "./elastic": { elasticClient: elasticClientMock },
      "./redis": {
        redisClient: redisClientMock,
        getRedisData: getRedisDataStub,
        setRedisData: setRedisDataStub,
      },
      crypto: require("crypto"),
    });
  });

  describe("constructor", () => {
    it("should set default properties from input", () => {
      const indexer = new ElasticIndexer("SomeIndex", {
        mapping: { id: "int" },
        isSilent: true,
      });
      expect(indexer.indexName).to.equal("someindex");
      expect(indexer.mapping).to.have.property("id");
      expect(indexer.isSilent).to.be.true;
    });
  });

  describe("checkIndex", () => {
    it("should check if index exists", async () => {
      const indexer = new ElasticIndexer("test-index");
      const exists = await indexer.checkIndex();
      expect(exists).to.be.true;
    });
    it("should return false on error", async () => {
      elasticClientMock.indices.exists.rejects(new Error("fail"));
      const indexer = new ElasticIndexer("test-index");
      const exists = await indexer.checkIndex();
      expect(exists).to.be.false;
    });
  });

  describe("updateMapping", () => {
    it("should update mapping when index exists", async () => {
      const indexer = new ElasticIndexer("test-index", {
        mapping: { field1: { type: "text" } },
      });
      const result = await indexer.updateMapping({ field1: { type: "text" } });
      expect(result).to.have.property("acknowledged", true);
    });
    it("should create index if it does not exist", async () => {
      elasticClientMock.indices.exists.resolves(false);
      const indexer = new ElasticIndexer("test-index", { mapping: {} });
      await indexer.updateMapping({});
      expect(elasticClientMock.indices.create.calledOnce).to.be.true;
    });
  });

  describe("indexBulkData", () => {
    it("should index bulk data without errors", async () => {
      const indexer = new ElasticIndexer("test-index");
      await indexer.indexBulkData([{ id: 1, name: "test" }]);
      expect(elasticClientMock.bulk.calledOnce).to.be.true;
    });
  });

  describe("indexData", () => {
    it("should index single data item", async () => {
      const indexer = new ElasticIndexer("test-index");
      await indexer.indexData({ id: "1", name: "doc" });
      expect(elasticClientMock.index.calledOnce).to.be.true;
    });
    it("should return early and log when data is null", async () => {
      const indexer = new ElasticIndexer("test-index");
      const spy = sinon.spy(console, "log");
      await indexer.indexData(null);
      expect(spy.calledWithMatch("Null data indexing error when indexing Data"))
        .to.be.true;
      spy.restore();
    });
    it("should delete documents with same uniqueField value", async () => {
      const indexer = new ElasticIndexer("test-index");
      elasticClientMock.search.resolves({
        hits: {
          hits: [
            { _id: "2" }, // Should be deleted
            { _id: "1" }, // Should be skipped (same id)
          ],
        },
      });
      elasticClientMock.get.resolves({ found: true, _source: { id: "1" } });
      await indexer.indexData({ id: "1", email: "x@test.com" }, "email");
      expect(elasticClientMock.delete.calledWithMatch({ id: "2" })).to.be.true;
    });
    it(" should call publishEvent with correct event", async () => {
      const indexer = new ElasticIndexer("test-index");
      const spy = sinon.stub(indexer, "publishEvent").resolves();
      await indexer.indexData({ id: "1" });
      expect(spy.called).to.be.true;
    });
  });

  describe("deleteData", () => {
    it("should delete document by id", async () => {
      const indexer = new ElasticIndexer("test-index");
      await indexer.deleteData("1");
      expect(elasticClientMock.delete.calledOnce).to.be.true;
    });
  });

  describe("getDataById", () => {
    it("should get document by id", async () => {
      const indexer = new ElasticIndexer("test-index");
      const doc = await indexer.getDataById("1");
      expect(doc).to.deep.equal({ id: "1" });
    });

    it("should return null if no doc found", async () => {
      elasticClientMock.get.resolves({ found: false });
      const indexer = new ElasticIndexer("test-index");
      const doc = await indexer.getDataById("1");
      expect(doc).to.be.null;
    });

    it("should return [] when id array is empty", async () => {
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getDataById([]);
      expect(result).to.deep.equal([]);
    });
  });

  describe("clearIndex", () => {
    it("should clear index", async () => {
      const indexer = new ElasticIndexer("test-index");
      await indexer.clearIndex();
      expect(elasticClientMock.deleteByQuery.calledOnce).to.be.true;
    });
  });

  describe("getOne", () => {
    it("should get one document by query", async () => {
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getOne({ match_all: {} });
      expect(result).to.deep.equal({ id: 1 });
    });

    it("should return null for missing getOne query", async () => {
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getOne(null);
      expect(result).to.be.null;
    });

    it("should return null on elasticClient.search error", async () => {
      elasticClientMock.search.rejects(new Error("search failed"));
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getOne({});
      expect(result).to.be.null;
    });
  });

  describe("getCount", () => {
    it("should get document count", async () => {
      const indexer = new ElasticIndexer("test-index");
      const count = await indexer.getCount({ match_all: {} });
      expect(count).to.equal(10);
    });
    it("should return 0 on elasticClient.count failure", async () => {
      elasticClientMock.count.rejects(new Error("boom"));
      const indexer = new ElasticIndexer("test-index");
      const count = await indexer.getCount({});
      expect(count).to.equal(0);
    });
  });

  describe("getDataByPage", () => {
    it("should get data by page", async () => {
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getDataByPage(0, 10, { match_all: {} });
      expect(result).to.deep.equal([{ id: 1 }]);
    });
    it("should return from cache when available", async () => {
      getRedisDataStub.resolves(JSON.stringify([{ id: 42 }]));
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getDataByPage(
        0,
        10,
        { match_all: {} },
        null,
        true,
      );
      expect(result).to.deep.equal([{ id: 42 }]);
    });
  });

  describe("updateIndex", () => {
    it("should call updateIndex and retry on conflict", async () => {
      elasticClientMock.updateByQuery
        .onCall(0)
        .resolves({ version_conflicts: true });
      elasticClientMock.updateByQuery
        .onCall(1)
        .resolves({ version_conflicts: false });

      const indexer = new ElasticIndexer("test-index", { mapping: {} });
      const result = await indexer.updateIndex(
        {},
        "ctx._source.field = params.value",
        { value: 1 },
      );
      expect(result.version_conflicts).to.be.false;
      expect(elasticClientMock.updateByQuery.callCount).to.be.above(1);
    });
    it("should return undefined on elasticClient.updateByQuery error", async () => {
      elasticClientMock.updateByQuery.rejects(new Error("update error"));
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.updateIndex({}, "", {});
      expect(result).to.be.undefined;
    });
  });

  describe("deleteByQuery", () => {
    it("should call elasticClient.deleteByQuery with query", async () => {
      const indexer = new ElasticIndexer("test-index");
      const query = { match_all: {} };
      await indexer.deleteByQuery(query);
      expect(
        elasticClientMock.deleteByQuery.calledWithMatch({
          index: "test-index",
          query,
        }),
      ).to.be.true;
    });

    it("should handle error in deleteByQuery gracefully", async () => {
      elasticClientMock.deleteByQuery.rejects(new Error("delete failed"));
      const indexer = new ElasticIndexer("test-index");
      await indexer.deleteByQuery({}); // Should not throw
    });
  });

  describe("getAggregations", () => {
    it("should return aggregations from elasticClient response", async () => {
      elasticClientMock.search.resolves({
        aggregations: { count: { value: 10 } },
      });
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getAggregations({
        terms: { field: "status" },
      });
      expect(result).to.deep.equal({ count: { value: 10 } });
    });

    it("should return null if no query is passed", async () => {
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getAggregations(null);
      expect(result).to.be.null;
    });

    it("should return null if elasticClient.search throws", async () => {
      elasticClientMock.search.rejects(new Error("search error"));
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getAggregations({});
      expect(result).to.be.null;
    });
  });

  describe("getRedisKey", () => {
    it("should return SHA1 hashed Redis key", () => {
      const indexer = new ElasticIndexer("test-index");
      const key = indexer.getRedisKey(0, 10, { match_all: {} });
      expect(key).to.match(/^elasticCache:test-index:/);
      expect(key.length).to.be.above(20);
    });
  });

  describe("getFromRedis", () => {
    it("should return parsed data if Redis has value", async () => {
      getRedisDataStub.resolves(JSON.stringify([{ id: 1 }]));
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getFromRedis("some-key");
      expect(result).to.deep.equal([{ id: 1 }]);
    });

    it("should return null if Redis returns null", async () => {
      getRedisDataStub.resolves(null);
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getFromRedis("missing-key");
      expect(result).to.be.null;
    });

    it("should return null if JSON parsing throws", async () => {
      getRedisDataStub.resolves("invalid-json");
      const indexer = new ElasticIndexer("test-index");
      const result = await indexer.getFromRedis("bad-key");
      expect(result).to.be.null;
    });
  });

  describe("setToRedis", () => {
    it("should store data in Redis with expiry", async () => {
      const indexer = new ElasticIndexer("test-index");
      await indexer.setToRedis("my-key", { test: 1 });
      expect(setRedisDataStub.calledWith("my-key", { test: 1 }, 300)).to.be
        .true;
    });

    it("should handle error in setRedisData silently", async () => {
      setRedisDataStub.rejects(new Error("redis error"));
      const indexer = new ElasticIndexer("test-index");
      await indexer.setToRedis("key", { test: 1 });
    });
  });

  describe("deleteRedisCache", () => {
    it("should iterate Redis keys and delete each", async () => {
      redisClientMock.scanIterator.returns(["k1", "k2"][Symbol.iterator]());
      const indexer = new ElasticIndexer("test-index");
      const deleted = await indexer.deleteRedisCache();
      expect(deleted).to.equal(2);
      expect(redisClientMock.del.callCount).to.equal(2);
    });

    it("should return 0 when no keys found", async () => {
      redisClientMock.scanIterator.returns([][Symbol.iterator]());
      const indexer = new ElasticIndexer("test-index");
      const deleted = await indexer.deleteRedisCache();
      expect(deleted).to.equal(0);
    });

    it("should handle redis deletion error gracefully", async () => {
      redisClientMock.scanIterator.returns(["k1"][Symbol.iterator]());
      redisClientMock.del.rejects(new Error("fail"));
      const indexer = new ElasticIndexer("test-index");
      const deleted = await indexer.deleteRedisCache();
      expect(deleted).to.equal(0);
    });
  });
});
