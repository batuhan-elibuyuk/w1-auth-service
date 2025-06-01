const { expect } = require("chai");
const HexaListener = require("../../src/common/hexa-listener");

describe("HexaListener", () => {
  let listener;

  beforeEach(() => {
    listener = new HexaListener(
      "eventName",
      () => {},
      { data: "callbackData" },
      "listenerType",
    );
  });

  it("should initialize with correct properties", () => {
    expect(listener.eventName).to.equal("eventName");
    expect(listener.eventHandler).to.be.a("function");
    expect(listener.sessionIdPath).to.equal("sessionId");
    expect(listener.callBackData).to.deep.equal({ data: "callbackData" });
    expect(listener.listenerType).to.equal("listenerType");
  });

  it("should return the correct session data from getSession", async () => {
    const session = await listener.getSession("sessionId");
    expect(session).to.have.property("id", "c10d12345678901234567801");
    expect(session).to.have.property(
      "userId",
      "a10d1234567890123456780112345678",
    );
    expect(session).to.have.property("ip", "145.1.11.24");
    expect(session).to.have.property("isAdmin", true);
  });
});
