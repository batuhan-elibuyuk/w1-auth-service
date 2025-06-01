const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("PaymentGate", () => {
  let PaymentGate, createPaymentGate, registerPaymentGate, getPaymentGate;
  let paymentGate;
  let setRedisDataStub;
  let getRedisDataStub;

  const checkoutInfo = {
    checkoutName: "testCheckout",
    checkoutStartUrl: "http://example.com/start",
    checkoutSimpleUrl: "http://example.com/simple",
    checkoutEndUrl: "http://example.com/end",
    getOrderUrl: "http://example.com/order",
    checkoutCallbackUrl: "http://example.com/callback",
    checkoutRefreshUrl: "http://example.com/refresh",
    getStoredCardsUrl: "http://example.com/cards",
  };

  const gateConfig = { key: "testConfig" };

  beforeEach(async () => {
    setRedisDataStub = sinon.stub().resolves("OK");
    getRedisDataStub = sinon.stub().resolves({ amount: 100 });

    ({ PaymentGate, createPaymentGate, registerPaymentGate, getPaymentGate } =
      proxyquire("../../src/common/paymentGate", {
        "./redis": {
          setRedisData: setRedisDataStub,
          getRedisData: getRedisDataStub,
        },
      }));

    registerPaymentGate("testGate", PaymentGate);
    paymentGate = await createPaymentGate("testGate", gateConfig, checkoutInfo);
  });

  describe("saveStartParameters", () => {
    it("should save start parameters to Redis", async () => {
      const paymentId = "p123";
      const params = { amount: 10 };

      await paymentGate.saveStartParameters(paymentId, params);

      expect(setRedisDataStub.calledOnce).to.be.true;
      expect(setRedisDataStub.firstCall.args[0]).to.equal(
        "testGate-payment-start-parameter:p123",
      );
      expect(setRedisDataStub.firstCall.args[1]).to.deep.equal(params);
    });

    it("should handle errors when saving start parameters", async () => {
      setRedisDataStub.rejects(new Error("fail"));
      const paymentId = "p123";
      const params = { amount: 10 };

      await paymentGate.saveStartParameters(paymentId, params);

      expect(setRedisDataStub.calledOnce).to.be.true;
    });
  });

  describe("readStartParameters", () => {
    it("should read start parameters from Redis", async () => {
      const result = await paymentGate.readStartParameters("payment123");
      expect(getRedisDataStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({ amount: 100 });
    });

    it("should return null on Redis read error", async () => {
      getRedisDataStub.rejects(new Error("redis fail"));
      const result = await paymentGate.readStartParameters("bad-id");
      expect(result).to.be.null;
    });
  });

  describe("Customer Id and Stored Card Functions", () => {
    it("should get customer id", async () => {
      const getCustomerIdFunc = sinon.stub().returns("customer123");
      paymentGate.setCustomerFunctions(getCustomerIdFunc, null, null);

      const userId = "user123";
      const customerId = await paymentGate.getCustomerId(userId);

      expect(getCustomerIdFunc.calledOnceWith(userId)).to.be.true;
      expect(customerId).to.equal("customer123");
    });

    it("should save customer id", async () => {
      const saveCustomerIdFunc = sinon.stub().resolves();
      paymentGate.setCustomerFunctions(null, saveCustomerIdFunc, null);

      const userId = "user123";
      const customerId = "customer123";
      const fullname = "John Doe";
      const email = "johndoe@example.com";

      await paymentGate.saveCustomerId(userId, customerId, fullname, email);

      expect(
        saveCustomerIdFunc.calledOnceWith(userId, customerId, fullname, email),
      ).to.be.true;
    });

    it("should save stored card", async () => {
      const saveStoredCardFunc = sinon.stub().resolves();
      paymentGate.setCustomerFunctions(null, null, saveStoredCardFunc);

      const storedCard = { cardNumber: "1234" };

      await paymentGate.saveStoredCard(storedCard);

      expect(saveStoredCardFunc.calledOnceWith(storedCard)).to.be.true;
    });

    it("should return null if getCustomerIdFunc is not set", async () => {
      paymentGate.setCustomerFunctions(null, null, null);
      const result = await paymentGate.getCustomerId("user123");
      expect(result).to.be.null;
    });

    it("should return null if saveCustomerIdFunc is not set", async () => {
      paymentGate.setCustomerFunctions(null, null, null);
      const result = await paymentGate.saveCustomerId("u", "c", "f", "e");
      expect(result).to.be.null;
    });

    it("should return null if saveStoredCardFunc is not set", async () => {
      paymentGate.setCustomerFunctions(null, null, null);
      const result = await paymentGate.saveStoredCard({ cardNumber: "1234" });
      expect(result).to.be.null;
    });
  });
  describe("createPaymentGate", () => {
    it("should create a payment gate", async () => {
      const newPaymentGate = await createPaymentGate(
        "testGate",
        gateConfig,
        checkoutInfo,
      );
      expect(newPaymentGate).to.be.instanceOf(PaymentGate);
      expect(newPaymentGate.gateName).to.equal("testGate");
    });
    it("should return null if gate class is not registered", async () => {
      const result = await createPaymentGate("unknownGate", {}, checkoutInfo);
      expect(result).to.be.null;
    });
  });

  describe("getPaymentGate", () => {
    it("should return the payment gate by checkoutName", () => {
      const checkoutName = "testCheckout";
      const paymentGate = getPaymentGate(checkoutName);

      expect(paymentGate).to.be.instanceOf(PaymentGate);
      expect(paymentGate.checkoutName).to.equal(checkoutName);
    });
    it("should return undefined if payment gate not found by checkout name", () => {
      const result = getPaymentGate("unknownCheckout");
      expect(result).to.be.undefined;
    });
  });
});
