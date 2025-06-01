const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

//For these tests to work we need to export RegisterUserRestController also from file registeruser.js
describe("RegisterUserRestController", () => {
  let RegisterUserRestController, registerUser;
  let RegisterUserManagerStub, processRequestStub;
  let req, res, next;

  beforeEach(() => {
    req = { requestId: "req-456" };
    res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    next = sinon.stub();

    // Stub for RegisterUserManager constructor
    RegisterUserManagerStub = sinon.stub();

    // Stub for processRequest inherited from RestController
    processRequestStub = sinon.stub();

    // Proxyquire module under test with mocks
    ({ RegisterUserRestController, registerUser } = proxyquire(
      "../../../src/controllers-layer/rest-layer/main/user/registeruser.js",
      {
        serviceCommon: {
          HexaLogTypes: {},
          hexaLogger: { insertInfo: sinon.stub(), insertError: sinon.stub() },
        },
        managers: {
          RegisterUserManager: RegisterUserManagerStub,
        },
        "../../RestController": class {
          constructor(name, routeName, _req, _res, _next) {
            this.name = name;
            this.routeName = routeName;
            this._req = _req;
            this._res = _res;
            this._next = _next;
            this.processRequest = processRequestStub;
          }
        },
      },
    ));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("RegisterUserRestController class", () => {
    it("should extend RestController with correct values", () => {
      const controller = new RegisterUserRestController(req, res, next);

      expect(controller.name).to.equal("registerUser");
      expect(controller.routeName).to.equal("registeruser");
      expect(controller.dataName).to.equal("user");
      expect(controller.crudType).to.equal("create");
      expect(controller.status).to.equal(201);
      expect(controller.httpMethod).to.equal("POST");
    });

    it("should create RegisterUserManager in createApiManager()", () => {
      const controller = new RegisterUserRestController(req, res, next);
      controller._req = req;

      controller.createApiManager();

      expect(RegisterUserManagerStub.calledOnceWithExactly(req, "rest")).to.be
        .true;
    });
  });

  describe("registerUser function", () => {
    it("should create instance and call processRequest", async () => {
      await registerUser(req, res, next);

      expect(processRequestStub.calledOnce).to.be.true;
    });
  });
});
