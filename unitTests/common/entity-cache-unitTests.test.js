const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("EntityCache", () => {
  let EntityCache, redisClientMock, setRedisDataStub, getRedisDataStub;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    redisClientMock = {
      del: sandbox.stub().resolves(),
      sAdd: sandbox.stub().resolves(),
      sRem: sandbox.stub().resolves(),
      sMembers: sandbox.stub().resolves([]),
      sInter: sandbox.stub().resolves([]),
    };

    setRedisDataStub = sandbox.stub().resolves();
    getRedisDataStub = sandbox.stub().resolves(null);

    EntityCache = proxyquire("../../src/common/entity-cache", {
      "./redis": {
        redisClient: redisClientMock,
        setRedisData: setRedisDataStub,
        getRedisData: getRedisDataStub,
      },
    });
  });

  afterEach(() => sandbox.restore());

  describe("saveEntityToCache", () => {
    it("should save entity to Redis and index it", async () => {
      const cache = new EntityCache("user", ["email"]);
      const entity = { id: "1", email: "test@test.com", isActive: true };

      await cache.saveEntityToCache(entity);

      expect(setRedisDataStub.called).to.be.true;
      expect(redisClientMock.sAdd.called).to.be.true;
    });

    it("should skip saving if isActive is false", async () => {
      const cache = new EntityCache("user", ["email"]);
      const result = await cache.saveEntityToCache({
        id: "2",
        isActive: false,
      });
      expect(result).to.equal(0);
    });

    it("should not fail if entity has no id", async () => {
      const cache = new EntityCache("user", []);
      await cache.saveEntityToCache({ email: "x@test.com" }); // No error expected
    });
  });

  describe("delEntityFromCache", () => {
    it("should delete entity and related index keys", async () => {
      redisClientMock.sMembers.resolves(["index1", "index2"]);

      const cache = new EntityCache("user", ["email"]);
      await cache.delEntityFromCache("1");

      expect(redisClientMock.del.called).to.be.true;
      expect(redisClientMock.sRem.calledWith("index1", "1")).to.be.true;
    });

    it("should fallback to defaultId when no id provided", async () => {
      const cache = new EntityCache("user", []);
      cache.defaultId = "default123";
      await cache.delEntityFromCache(); // uses defaultId
      expect(redisClientMock.del.calledWith("ecache:user:default123")).to.be
        .true;
    });
  });

  describe("getEntityFromCache", () => {
    it("should return entity from Redis", async () => {
      getRedisDataStub.resolves({ id: "1", name: "Test" });
      const cache = new EntityCache("user", []);
      const result = await cache.getEntityFromCache("1");
      expect(result).to.deep.equal({ id: "1", name: "Test" });
    });

    it("should return null if entity is missing", async () => {
      getRedisDataStub.resolves(null);
      const cache = new EntityCache("user", []);
      const result = await cache.getEntityFromCache("1");
      expect(result).to.be.null;
    });
  });

  describe("selectEntityFromCache", () => {
    it("should select entities matching all index keys", async () => {
      redisClientMock.sInter.resolves(["1", "2"]);
      getRedisDataStub.withArgs("ecache:user:1").resolves({ id: "1" });
      getRedisDataStub.withArgs("ecache:user:2").resolves({ id: "2" });

      const cache = new EntityCache("user", ["email"]);
      const result = await cache.selectEntityFromCache({ email: "x@test.com" });

      expect(result).to.deep.equal([{ id: "1" }, { id: "2" }]);
    });

    it("should skip null entities", async () => {
      redisClientMock.sInter.resolves(["1"]);
      getRedisDataStub.withArgs("ecache:user:1").resolves(null);

      const cache = new EntityCache("user", ["email"]);
      const result = await cache.selectEntityFromCache({ email: "x@test.com" });
      expect(result).to.deep.equal([]);
    });
    it("should combine multiple query fields correctly", async () => {
      redisClientMock.sInter.resolves(["1"]);
      getRedisDataStub.withArgs("ecache:user:1").resolves({ id: "1" });

      const cache = new EntityCache("user", ["email", "role"]);
      const result = await cache.selectEntityFromCache({
        email: "a@test.com",
        role: "admin",
      });

      expect(
        redisClientMock.sInter.calledWithMatch([
          "ecache:user-by-email:a@test.com",
          "ecache:user-by-role:admin",
        ]),
      ).to.be.true;
      expect(result).to.deep.equal([{ id: "1" }]);
    });
  });
});
