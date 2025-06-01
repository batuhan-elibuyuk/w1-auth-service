const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("UserManager", () => {
  let ManagerClass;
  let manager;
  let req;

  beforeEach(() => {
    req = {
      session: {
        _USERID: "u1",
        fullname: "Test User",
        name: "Test",
        surname: "User",
        email: "test@example.com",
      },
    };
    ManagerClass = proxyquire(
      "../../../../src/manager-layer/main/User/UserManager",
      {
        "../../service-manager/AuthServiceManager": class {
          constructor() {
            this.session = req.session;
            this.bodyParams = {};
          }
          toJSON() {
            return {};
          }
        },
      },
    );
    manager = new ManagerClass(req);
  });

  describe("constructor", () => {
    it("should initialize properties correctly", () => {
      const ManagerClass = proxyquire(
        "../../../../src/manager-layer/main/User/UserManager",
        {
          "../../service-manager/AuthServiceManager": class {
            constructor(request, options) {
              this.session = request.session;
              this.bodyParams = {};
            }
          },
        },
      );

      const req = {
        session: {
          _USERID: "u1",
          fullname: "Test User",
          name: "Test",
          surname: "User",
          email: "test@example.com",
        },
      };

      const instance = new ManagerClass(req);
      expect(instance).to.have.property("objectName", "user");
      expect(instance).to.have.property("modelName", "User");
      expect(instance).to.have.property("routeResourcePath", "");
      expect(instance.session).to.equal(req.session);
    });
  });

  describe("getParentOrganization", () => {
    it("should return null if no foreignKey is provided", async () => {
      const result = await manager.getParentOrganization();
      expect(result).to.be.null;
    });

    it("should call getOrganizationById with correct ID", async () => {
      const fakeData = { id: "org-123" };
      const methodName = "getOrganizationById";
      const methodStub = sinon.stub().resolves(fakeData);

      const stubs = {};
      stubs[methodName] = methodStub;

      const ManagerClass = proxyquire(
        "../../../../src/manager-layer/main/User/UserManager",
        {
          "../../service-manager/AuthServiceManager": class {
            constructor() {
              this.session = req.session;
            }
            toJSON() {
              return {};
            }
          },
          dbLayer: stubs,
        },
      );

      const instance = new ManagerClass(req);
      const result = await instance.getParentOrganization("org-123");

      expect(result).to.deep.equal(fakeData);
      expect(methodStub.calledOnceWithExactly("org-123")).to.be.true;
    });
  });

  describe("getParentCompanyProfile", () => {
    it("should return null if no foreignKey is provided", async () => {
      const result = await manager.getParentCompanyProfile();
      expect(result).to.be.null;
    });

    it("should call ElasticIndexer.getDataById with correct ID", async () => {
      const fakeData = { id: "cp-1" };
      const getStub = sinon.stub().resolves(fakeData);
      const elasticStub = sinon.stub().returns({ getDataById: getStub });

      const ManagerClass = proxyquire(
        "../../../../src/manager-layer/main/User/UserManager",
        {
          "../../service-manager/AuthServiceManager": class {
            constructor() {
              this.session = req.session;
            }
            toJSON() {
              return {};
            }
          },
          serviceCommon: { ElasticIndexer: elasticStub },
        },
      );

      const instance = new ManagerClass(req);
      const result = await instance.getParentCompanyProfile("cp-1");

      expect(result).to.deep.equal(fakeData);
      expect(elasticStub.calledOnceWithExactly("companyProfile")).to.be.true;
      expect(getStub.calledOnceWithExactly("cp-1")).to.be.true;
    });
  });
});
