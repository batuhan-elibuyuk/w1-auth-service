const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("DBGetListCommand Variants", () => {
  let commands;

  beforeEach(() => {
    commands = proxyquire("../../src/db-command/db-getlist-command.js", {
      "../../src/db-command/db-command.js": class {
        constructor(input) {
          this.input = input;
          this.dbData = null;
          this.queryCacher = null;
          this.objectName = "result";
          this.convertAggregationsToNumbers = sinon.stub();
        }

        async runDbCommand() {}
        async buildWhereClause() {}
        async buildDataClause() {}
        async getCqrsJoins() {}
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("DBGetListCommand preCommand/postCommand", () => {
    it("should return cache if available in preCommand", async () => {
      const cachedData = { items: [{ id: 1 }] };
      const queryCacher = {
        readQueryResult: sinon.stub().resolves(cachedData),
        queryKey: "key123",
      };

      const input = { id: "1" };
      const cmd = new commands.DBGetListMongooseCommand(input);
      cmd.queryCacher = queryCacher;

      const result = await cmd.preCommand();

      expect(result).to.eql(cachedData);
      expect(result._source).to.equal("cache");
      expect(result._cacheKey).to.equal("key123");
      expect(input.dbData).to.eql(cachedData);
    });

    it("should write cache and set _cacheKey/_source in postCommand", async () => {
      const input = { id: "1" };
      const cacheStub = {
        writeQueryResult: sinon.stub(),
        queryKey: "qk999",
      };

      const cmd = new commands.DBGetListMongooseCommand(input);
      cmd.dbData = {};
      cmd.queryCacher = cacheStub;

      await cmd.postCommand();

      expect(cmd.dbData._cacheKey).to.equal("qk999");
      expect(cmd.dbData._source).to.equal("db");
      expect(cacheStub.writeQueryResult.calledOnce).to.be.true;
    });
  });

  describe("prepareDbData()", () => {
    it("should calculate totalRowCount and map getData for array", async () => {
      const item1 = { getData: sinon.stub().returns({ id: 1 }) };
      const item2 = { getData: sinon.stub().returns({ id: 2 }) };
      const rowData = [item1, item2];

      const cmd = new commands.DBGetListMongooseCommand({
        pagination: { pageRowCount: 10, pageNumber: 1 },
        getJoins: false,
      });

      cmd.dbData = {};
      await cmd.prepareDbData(rowData);

      expect(cmd.dbData.totalRowCount).to.equal(0); // default from setPaginationTotalRowCount
      expect(cmd.dbData.pageCount).to.equal(0);
      expect(cmd.dbData.items).to.eql([{ id: 1 }, { id: 2 }]);
    });

    it("should handle non-array rowData and convert aggregations", async () => {
      const rowData = {
        getData: sinon.stub().returns({ sum: 100, count: 5 }),
      };

      const cmd = new commands.DBGetListMongooseCommand({});
      cmd.dbData = {};

      await cmd.prepareDbData(rowData);

      expect(cmd.dbData.items).to.eql({ sum: 100, count: 5 });
      expect(cmd.convertAggregationsToNumbers.calledOnce).to.be.true;
    });
  });

  describe("DBGetListMongooseCommand.runDbCommand", () => {
    it("should run and prepare data if found", async () => {
      const mongooseQuery = {
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves([{ getData: () => ({ id: 1 }) }]),
      };

      class TestCmd extends commands.DBGetListMongooseCommand {
        createQuery() {
          return mongooseQuery;
        }
        populateQuery(query) {
          return query;
        }
      }

      const input = { pagination: { pageRowCount: 10, pageNumber: 1 } };
      const cmd = new TestCmd(input);
      cmd.prepareDbData = sinon.stub().resolves();

      await cmd.runDbCommand();

      expect(mongooseQuery.limit.calledOnce).to.be.true;
      expect(mongooseQuery.skip.calledOnce).to.be.true;
      expect(cmd.dbData).to.eql({ items: [] });
    });

    it("should return empty dbData if no result", async () => {
      const mongooseQuery = {
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(null),
      };

      class TestCmd extends commands.DBGetListMongooseCommand {
        createQuery() {
          return mongooseQuery;
        }
        populateQuery(query) {
          return query;
        }
      }

      const cmd = new TestCmd({});
      const result = await cmd.runDbCommand();

      expect(result).to.eql({ items: [] });
    });
  });

  describe("DBGetListMongooseCommand.paginateQuery", () => {
    it("should apply limit and skip to the query when pagination exists", () => {
      const input = {
        pagination: {
          pageRowCount: 10,
          pageNumber: 2,
        },
      };

      const query = {
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
      };

      const cmd = new commands.DBGetListMongooseCommand(input);
      const result = cmd.paginateQuery(query);

      expect(query.limit.calledWith(10)).to.be.true;
      expect(query.skip.calledWith(10)).to.be.true; // page 2: skip = 10
      expect(result).to.equal(query);
    });

    it("should return unmodified query if pagination is not provided", () => {
      const query = {
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
      };

      const cmd = new commands.DBGetListMongooseCommand({}); // no pagination
      const result = cmd.paginateQuery(query);

      expect(query.limit.called).to.be.false;
      expect(query.skip.called).to.be.false;
      expect(result).to.equal(query);
    });
  });

  describe("DBGetListSequelizeCommand.runDbCommand", () => {
    it("should execute query and prepare data with pagination", async () => {
      const rowData = {
        count: 2,
        rows: [{ getData: () => ({ id: 1 }) }, { getData: () => ({ id: 2 }) }],
      };

      class TestCmd extends commands.DBGetListSequelizeCommand {
        executeQuery() {
          return Promise.resolve(rowData);
        }

        getSelectList() {
          return ["id"];
        }
        async prepareDbData(data) {
          this.dbData.items = data;
        }
      }

      const input = { pagination: { pageRowCount: 5 } };
      const cmd = new TestCmd(input);
      cmd.dbData = {};
      cmd.objectName = "myList";

      await cmd.runDbCommand();

      expect(cmd.input.myList).to.eql(rowData.rows);
      expect(cmd.dbData.items).to.eql(rowData.rows);
    });

    it("should return dbData with no rows if nothing found", async () => {
      class TestCmd extends commands.DBGetListSequelizeCommand {
        executeQuery() {
          return Promise.resolve(null);
        }
      }

      const cmd = new TestCmd({});
      const result = await cmd.runDbCommand();

      expect(result).to.eql({ items: [] });
    });
  });
});
