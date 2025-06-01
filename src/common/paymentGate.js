const { PaymentGateError } = require("./error");

const { redisClient, getRedisData, setRedisData } = require("./redis");

class PaymentGate {
  constructor(gateName, config, checkoutInfo) {
    this.gateName = gateName;
    this.config = config;
    this.checkoutName = checkoutInfo.checkoutName;
    this.checkoutStartUrl = checkoutInfo.checkoutStartUrl;
    this.checkoutSimpleUrl = checkoutInfo.checkoutSimpleUrl;
    this.checkoutEndUrl = checkoutInfo.checkoutEndUrl;
    this.getOrderUrl = checkoutInfo.getOrderUrl;
    this.checkoutCallbackUrl = checkoutInfo.checkoutCallbackUrl;
    this.checkoutRefreshUrl = checkoutInfo.checkoutRefreshUrl;
    this.getStoredCardsUrl = checkoutInfo.getStoredCardsUrl;

    this.hasWebhook = true;
    this.hasCallback = true;
  }

  setCustomerFunctions(
    getCustomerIdFunc,
    saveCustomerIdFunc,
    saveStoredCardFunc,
  ) {
    this.getCustomerIdFunc = getCustomerIdFunc;
    this.saveCustomerIdFunc = saveCustomerIdFunc;
    this.saveStoredCardFunc = saveStoredCardFunc;
  }

  async saveStartParameters(paymentId, parameters) {
    const paramsKey = `${this.gateName}-payment-start-parameter:${paymentId}`;
    try {
      await setRedisData(paramsKey, parameters, 60 * 60 * 24 * 3);
    } catch (err) {
      console.log(err.message);
    }
  }

  async readStartParameters(paymentId) {
    const paramsKey = `${this.gateName}-payment-start-parameter:${paymentId}`;

    try {
      const data = await getRedisData(paramsKey);
      return data;
    } catch (err) {
      console.log(err.message);
      return null;
    }
  }

  async getCustomerId(userId) {
    return this.getCustomerIdFunc ? this.getCustomerIdFunc(userId) : null;
  }

  async saveCustomerId(userId, customerId, fullname, email) {
    return this.saveCustomerIdFunc
      ? this.saveCustomerIdFunc(userId, customerId, fullname, email)
      : null;
  }

  async saveStoredCard(storedCard) {
    return this.saveStoredCardFunc ? this.saveStoredCardFunc(storedCard) : null;
  }

  async initPaymentGate() {}

  async registerWebHook(webhookUrl) {}

  async doSimpleCheckout(checkoutParams) {}

  async startCheckout(checkoutParams) {}

  async completeCheckout(checkoutParams) {}

  async refreshCheckout(checkoutParams) {}

  async webhookController(request, response) {}
  async callbackController(request, response) {}

  async getCheckoutDemoHtml(
    demoUrl,
    simpleCheckoutUrl,
    startcheckoutUrl,
    endCheckoutUrl,
    refreshCheckoutUrl,
    getOrderUrl,
    getStoredCardsUrl,
  ) {}
}

const registeredGates = {};

const paymentGatePool = {};

const registerPaymentGate = (gateName, gateClass) => {
  registeredGates[gateName] = gateClass;
};

const createPaymentGate = async (gateName, gateConfig, checkoutInfo) => {
  const checkoutName = checkoutInfo.checkoutName;
  const GateClass = registeredGates[gateName];
  const paymentGate = GateClass
    ? new PaymentGate(gateName, gateConfig, checkoutInfo)
    : null;
  paymentGatePool[checkoutName] = paymentGate;
  return paymentGate;
};

const getPaymentGate = (checkoutName) => {
  return paymentGatePool[checkoutName];
};

module.exports = {
  paymentGatePool,
  PaymentGate,
  PaymentGateError,
  createPaymentGate,
  registerPaymentGate,
  getPaymentGate,
};
