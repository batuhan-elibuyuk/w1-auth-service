const {
  PaymentGate,
  registerPaymentGate,
  PaymentGateError,
} = require("./paymentGate");
const Craftgate = require("@craftgate/craftgate");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class CraftGate extends PaymentGate {
  constructor(config, checkoutInfo, webhookCallback) {
    super("craftgate", config, checkoutInfo, webhookCallback);
    this.craftgate = new Craftgate.Client({
      apiKey: config.apiKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl,
    });
    this.callbackKey = config.callbackKey;
    this.webhookKey = config.webhookKey;
    this.literalValues = {
      FAILURE: "failed",
      SUCCESS: "success",
      INIT_THREEDS: "started",
      CALLBACK_THREEDS: "started",
    };
    this.hasWebhook = true;
    this.hasCallback = true;
  }

  getStatusLiteral(paymentStatus) {
    return this.literalValues[paymentStatus] ?? "unknown-" + paymentStatus;
  }
  async initPaymentGate() {}

  async registerWebHook(webhookUrl) {}

  async getStoredCard(cardUserKey, cardToken) {
    const request = {
      cardToken,
      cardUserKey,
    };
    try {
      const result = await this.craftgate.payment().searchStoredCards(request);

      const storedCard = result && result.items.length ? result.items[0] : null;

      return storedCard
        ? {
            customerId: storedCard.cardUserKey,
            cardHolderName: storedCard.cardHolderName,
            storedPaymentCard: storedCard.cardToken,
            cardType: storedCard.cardType,
            cardAssociation: storedCard.cardAssociation,
            cardBankName: storedCard.cardBankName,
            cardBrand: storedCard.cardBrand,
            binNumber: storedCard.binNumber,
            lastDigits: storedCard.lastFourDigits,
          }
        : null;
    } catch (err) {
      console.log(err);
    }
    return null;
  }

  async doSimpleCheckout(checkoutParams) {
    try {
      const userParams = checkoutParams.paymentUserParams;

      const useStoredCard =
        (!userParams.cardNumber && userParams.cardToken) ||
        checkoutParams.defaultCardToken;

      if (
        checkoutParams.storeCard ||
        (useStoredCard && !checkoutParams.customerId)
      ) {
        checkoutParams.customerId = await this.getCustomerId(
          checkoutParams.userId,
        );
      }

      const request = {
        price: checkoutParams.amount,
        paidPrice: checkoutParams.amount,
        walletPrice: 0.0,
        installment: 1,
        conversationId: checkoutParams.orderId,
        currency: "TRY", //checkoutParams.currency.toUpperCase(),
        paymentGroup: Craftgate.Model.PaymentGroup.ListingOrSubscription,
        card: {
          cardHolderName: userParams.cardHolderName,
          cardNumber: userParams.cardNumber,
          expireYear: userParams.expireYear,
          expireMonth: userParams.expireMonth,
          cvc: userParams.cvc,
          storeCardAfterSuccessPayment: userParams.storeCard,
          cardUserKey: checkoutParams.customerId,
          cardToken: useStoredCard
            ? (userParams.cardToken ?? checkoutParams.defaultCardToken)
            : null,
        },
        items: [
          {
            name: checkoutParams.description,
            price: checkoutParams.amount,
            externalId: checkoutParams.orderId,
          },
        ],
      };

      if (userParams.storeCard && userParams.cardNumber) {
        checkoutParams.uniqueHash = crypto
          .createHash("sha1")
          .update(userParams.cardNumber)
          .digest("hex");
      }

      const payment = await this.craftgate.payment().createPayment(request);

      const storedCard =
        checkoutParams.storeCard && payment.cardUserKey && payment.cardToken
          ? await this.getStoredCard(payment.cardUserKey, payment.cardToken)
          : null;

      if (storedCard) {
        storedCard.userId = checkoutParams.userId;
        storedCard.uniqueHash = checkoutParams.uniqueHash;

        if (!checkoutParams.customerId) {
          await this.saveCustomerId(
            checkoutParams.userId,
            storedCard.customerId,
            checkoutParams.fullname,
            checkoutParams.email,
          );
        }
        const storedCardId = await this.saveStoredCard(storedCard);
        storedCard.id = storedCardId;
      }

      return {
        paymentId: payment.id,
        paymentStatus: payment.paymentStatus,
        statusLiteral: this.getStatusLiteral(payment.paymentStatus),
        storedCard: storedCard,
      };
    } catch (err) {
      console.log(err);
      throw new PaymentGateError("craftgate", err.message, err._errorCode);
    }
  }

  async startCheckout(checkoutParams) {
    try {
      const userParams = checkoutParams.paymentUserParams;

      const useStoredCard =
        (!userParams.cardNumber && userParams.cardToken) ||
        checkoutParams.defaultCardToken;

      if (
        checkoutParams.storeCard ||
        (useStoredCard && !checkoutParams.customerId)
      ) {
        checkoutParams.customerId = await this.getCustomerId(
          checkoutParams.userId,
        );
      }

      const request = {
        price: checkoutParams.amount,
        paidPrice: checkoutParams.amount,
        walletPrice: 0.0,
        installment: 1,
        conversationId: checkoutParams.orderId,
        currency: "TRY", //checkoutParams.currency.toUpperCase(),
        callbackUrl: this.checkoutCallbackUrl,
        paymentGroup: Craftgate.Model.PaymentGroup.ListingOrSubscription,
        card: {
          cardHolderName: userParams.cardHolderName,
          cardNumber: userParams.cardNumber,
          expireYear: userParams.expireYear,
          expireMonth: userParams.expireMonth,
          cvc: userParams.cvc,
          storeCardAfterSuccessPayment: checkoutParams.storeCard,
          cardUserKey: checkoutParams.customerId,
          cardToken: useStoredCard
            ? (userParams.cardToken ?? checkoutParams.defaultCardToken)
            : null,
        },
        items: [
          {
            name: checkoutParams.description,
            price: checkoutParams.amount,
            externalId: checkoutParams.orderId,
          },
        ],
        additionalParams: {
          threeDSCallbackVersion: 2,
        },
      };

      const payment = await this.craftgate.payment().init3DSPayment(request);

      if (userParams.storeCard && userParams.cardNumber) {
        checkoutParams.uniqueHash = crypto
          .createHash("sha1")
          .update(userParams.cardNumber)
          .digest("hex");
      }

      await this.saveStartParameters(payment.paymentId, checkoutParams);

      return {
        paymentId: payment.paymentId,
        paymentStatus: payment.paymentStatus,
        statusLiteral: this.getStatusLiteral(payment.paymentStatus),
        paymentStartInfo: {
          htmlContent: payment.htmlContent,
          additionalAction: payment.additionalAction,
        },
      };
    } catch (err) {
      console.log(err);
      throw new PaymentGateError("craftgate", err.message, err._errorCode);
    }
  }

  async verifyCallback(callbackParams) {
    if (!callbackParams["hashParams"]) return false;
    const hashValues = callbackParams["hashParams"]
      .split(":")
      .map((param) => callbackParams[param])
      .join("");

    const calculatedHash = crypto
      .createHash("sha256")
      .update(this.callbackKey + hashValues)
      .digest("hex");
    return calculatedHash === callbackParams["hash"];
  }

  async completeCheckout(checkoutParams) {
    try {
      const request = {
        paymentId: checkoutParams.paymentId,
      };

      const payment = await this.craftgate
        .payment()
        .complete3DSPayment(request);

      const startParameters = await this.readStartParameters(payment.id);
      let storedCard = null;
      if (startParameters) {
        storedCard =
          startParameters.storeCard && payment.cardUserKey && payment.cardToken
            ? await this.getStoredCard(payment.cardUserKey, payment.cardToken)
            : null;

        if (storedCard) {
          storedCard.userId = startParameters.userId;
          storedCard.uniqueHash = startParameters.uniqueHash;

          if (!startParameters.customerId) {
            await this.saveCustomerId(
              startParameters.userId,
              storedCard.customerId,
              startParameters.fullname,
              startParameters.email,
            );
          }
          const storedCardId = await this.saveStoredCard(storedCard);
          storedCard.id = storedCardId;
        }
      }

      return {
        paymentId: payment.id,
        paymentStatus: payment.paymentStatus,
        statusLiteral: this.getStatusLiteral(payment.paymentStatus),
        paymentCompleteInfo: {
          mdStatus: payment.mdStatus,
          paymentPhase: payment.paymentPhase,
        },
        storedCard: storedCard,
      };
    } catch (err) {
      console.log(err);
      throw new PaymentGateError(
        "craftgate",
        err.message + ":" + JSON.stringify(request),
        err._errorCode,
      );
    }
  }

  async refreshCheckout(checkoutParams) {
    try {
      const paymentId = checkoutParams.paymentId;

      let payment = await this.craftgate.payment().retrievePayment(paymentId);

      if (!payment) {
        throw new PaymentGateError(
          "craftgate",
          "No payment found on craftgate with this id",
          404,
        );
      }

      if (payment.paymentStatus === "CALLBACK_THREEDS") {
        try {
          const request = {
            paymentId,
          };
          payment = await this.craftgate.payment().complete3DSPayment(request);
        } catch (err) {
          console.log(err);
          throw new PaymentGateError("craftgate", err.message, err._errorCode);
        }
      }

      const startParameters = await this.readStartParameters(payment.id);
      let storedCard = null;
      if (startParameters) {
        storedCard =
          startParameters.storeCard && payment.cardUserKey && payment.cardToken
            ? await this.getStoredCard(payment.cardUserKey, payment.cardToken)
            : null;

        if (storedCard) {
          storedCard.userId = startParameters.userId;
          storedCard.uniqueHash = startParameters.uniqueHash;
          if (!startParameters.customerId) {
            await this.saveCustomerId(
              startParameters.userId,
              storedCard.customerId,
              startParameters.fullname,
              startParameters.email,
            );
          }
          const storedCardId = await this.saveStoredCard(storedCard);
          storedCard.id = storedCardId;
        }
      }

      return {
        paymentId: payment.id,
        paymentStatus: payment.paymentStatus,
        paymentRefreshInfo: {},
        statusLiteral: this.getStatusLiteral(payment.paymentStatus),
        storedCard: storedCard,
      };
    } catch (err) {
      console.log(err);
      throw new PaymentGateError(
        "craftgate",
        err.message + ":" + JSON.stringify(request),
        err._errorCode,
      );
    }
  }

  async callbackController(request) {
    const callbackParams = request.body;

    if (!(await this.verifyCallback(callbackParams))) {
      console.log(`Craftgate Callback signature verification failed.`);
      throw new PaymentGateError(
        "craftgate",
        "Craftgate Callback signature verification failed.",
        401,
      );
    }

    try {
      const payment = await this.craftgate.payment().complete3DSPayment({
        paymentId: callbackParams.paymentId,
      });

      const startParameters = await this.readStartParameters(payment.id);

      let storedCard = null;
      if (startParameters) {
        storedCard =
          startParameters.storeCard && payment.cardUserKey && payment.cardToken
            ? await this.getStoredCard(payment.cardUserKey, payment.cardToken)
            : null;

        if (storedCard) {
          storedCard.userId = startParameters.userId;
          storedCard.uniqueHash = startParameters.uniqueHash;
          if (!startParameters.customerId) {
            await this.saveCustomerId(
              startParameters.userId,
              storedCard.customerId,
              startParameters.fullname,
              startParameters.email,
            );
          }
          const storedCardId = await this.saveStoredCard(storedCard);
          storedCard.id = storedCardId;
        }
      }

      return {
        paymentId: payment.id,
        paymentStatus: payment.paymentStatus,
        orderId: null,
        statusLiteral: this.getStatusLiteral(payment.paymentStatus),
        paymentCompleteInfo: {
          mdStatus: payment.mdStatus,
          paymentPhase: payment.paymentPhase,
        },
        storedCard: storedCard,
      };
    } catch (err) {
      console.log(err);
      throw new PaymentGateError(
        "craftgate",
        err.message + ":" + JSON.stringify(request),
        err._errorCode,
      );
    }
  }

  async webhookController(request) {
    const signature = request.headers["x-cg-signature-v1"];
    const webhookKey = this.webhookKey;

    let event = request.body;

    const webhookData = {
      eventType: event.eventType,
      eventTimestamp: event.eventTimestamp,
      status: event.status,
      payloadId: event.payloadId,
    };

    const verified = await this.craftgate
      .hook()
      .isWebhookVerified(webhookKey, signature, webhookData);
    if (!verified) {
      console.log(`Craftgate Webhook signature verification failed.`);
      throw new PaymentGateError(
        "craftgate",
        "Craftgate Webhook signature verification failed.",
        401,
      );
    }

    // Handle the event
    let paymentId = null;
    let orderId = null;
    let paymentStatus = null;
    let callbackResult = {};

    console.log("craftgate webhook event received:", event.eventType);
    switch (event.eventType) {
      case "THREEDS_VERIFY":
        // if callback fails complete will be handled here
        paymentId = event.payloadId;
        if (event.status === "SUCCESS") {
          let payment = await this.craftgate
            .payment()
            .retrievePayment(paymentId);

          if (payment && payment.status === "CALLBACK_THREEDS") {
            const request = {
              paymentId,
            };
            payment = await this.craftgate
              .payment()
              .complete3DSPayment(request);

            const startParameters = await this.readStartParameters(payment.id);
            let storedCard = null;
            if (startParameters) {
              storedCard =
                startParameters.storeCard &&
                payment.cardUserKey &&
                payment.cardToken
                  ? await this.getStoredCard(
                      payment.cardUserKey,
                      payment.cardToken,
                    )
                  : null;

              if (storedCard) {
                storedCard.userId = startParameters.userId;
                storedCard.uniqueHash = startParameters.uniqueHash;
                if (!startParameters.customerId) {
                  await this.saveCustomerId(
                    startParameters.userId,
                    storedCard.customerId,
                    startParameters.fullname,
                    startParameters.email,
                  );
                }
                const storedCardId = await this.saveStoredCard(storedCard);
                storedCard.id = storedCardId;
              }
            }

            return {
              statusLiteral: this.getStatusLiteral(paymentStatus),
              orderId,
              paymentId,
              paymentStatus,
              storedCard,
            };
          } else {
            console.log("craftgate payment already completed:", paymentId);
            return {
              statusLiteral: "unhandled",
              eventType: event.eventType,
              paymentId,
              paymentStatus,
            };
          }
        }

        break;

      case "API_AUTH":
      case "API_VERIFY_AND_AUTH":
      case "CHECKOUTFORM_AUTH":
        paymentId = event.payloadId;
        paymentStatus = event.status;
        console.log(`Payment with for ${paymentId} was ${paymentStatus} !`);
        orderId = null; // not know here, callback will find it
        return {
          statusLiteral: this.getStatusLiteral(paymentStatus),
          orderId,
          paymentId,
          paymentStatus,
        };
        break;

      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.eventType}.`);
        paymentId = event.payloadId;
        paymentStatus = event.status;
        return {
          statusLiteral: "unhandled",
          eventType: event.eventType,
          paymentId,
          paymentStatus,
        };
    }
  }

  async getCheckoutDemoHtml(
    demoUrl,
    simpleCheckoutUrl,
    startCheckoutUrl,
    endCheckoutUrl,
    refreshCheckoutUrl,
    getOrderUrl,
    getStoredCardsUrl,
  ) {
    const fPath = path.join(
      __dirname,
      "../",
      "checkout-demo",
      "craftgate-demo-checkout.html",
    );
    if (!fs.existsSync(fPath))
      return "Flow Demo Not Found For " + this.gateName;
    let html = fs.readFileSync(fPath, "utf8");
    html = html.replaceAll("$startCheckoutUrl", startCheckoutUrl);
    html = html.replaceAll("$simpleCheckoutUrl", simpleCheckoutUrl);
    html = html.replaceAll("$endCheckoutUrl", endCheckoutUrl);
    html = html.replaceAll("$refreshCheckoutUrl", refreshCheckoutUrl);
    html = html.replaceAll("$craftgatePublicKey", this.config.publicKey);
    html = html.replaceAll("$redirectUrl", demoUrl + "&page=Page3");
    html = html.replaceAll("$getOrderUrl", getOrderUrl);
    html = html.replaceAll("$getStoredCardsUrl", getStoredCardsUrl);
    return html;
  }
}

registerPaymentGate("craftgate", CraftGate);

module.exports = CraftGate;
