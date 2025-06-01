const { expect } = require("chai");
const sinon = require("sinon");
const HexaPublisher = require("../../src/common/hexa-publisher");

describe("HexaPublisher", () => {
  let publisher;
  let publishStub;

  beforeEach(() => {
    publisher = new HexaPublisher("testEvent", { some: "data" });
    publishStub = sinon.stub(publisher, "publish");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should create an instance of HexaPublisher with correct properties", () => {
    expect(publisher.eventName).to.equal("testEvent");
    expect(publisher.data).to.deep.equal({ some: "data" });
    expect(publisher.reTry).to.equal(0);
  });

  it("should correctly sleep for the specified time in setDelay()", async () => {
    const sleepStub = sinon.stub(publisher, "sleep").resolves();

    await publisher.setDelay(1000);
    expect(sleepStub.calledOnceWith(1000)).to.be.true;
    expect(publishStub.calledOnce).to.be.true;
  });

  it("should retry publishing with increasing delay in delayRetry()", async () => {
    const sleepStub = sinon.stub(publisher, "sleep").resolves();
    const delayRetrySpy = sinon.spy(publisher, "delayRetry");

    // Call delayRetry multiple times
    await publisher.delayRetry();
    expect(publisher.reTry).to.equal(1);
    expect(delayRetrySpy.calledOnce).to.be.true;
    expect(publisher.reTry * 500).to.equal(500); // The delay should be 500ms on first retry

    // Call delayRetry again
    await publisher.delayRetry();
    expect(publisher.reTry).to.equal(2);
    expect(delayRetrySpy.calledTwice).to.be.true;
    expect(publisher.reTry * 500).to.equal(1000); // The delay should be 1000ms on second retry

    // Call delayRetry until retry limit is reached
    publisher.reTry = 20; // Set to the retry limit
    const result = await publisher.delayRetry();
    expect(result).to.be.false; // It should return false after 20 retries
  });

  it("should stop retrying after 20 retries in delayRetry()", async () => {
    publisher.reTry = 20;
    const result = await publisher.delayRetry();
    expect(result).to.be.false; // It should return false if retries exceed 20
    expect(publisher.reTry).to.equal(20);
  });

  it("should allow publish to be called without implementation", async () => {
    const _publisher = new HexaPublisher("evt", { a: 1 });
    const result = await _publisher.publish(); // doesn't throw
    expect(result).to.be.undefined;
  });

  it("should work immediately with 0ms delay in setDelay", async () => {
    const sleepStub = sinon.stub(publisher, "sleep").resolves();
    await publisher.setDelay(0);
    expect(sleepStub.calledOnceWith(0)).to.be.true;
  });

  it("should return true from delayRetry if below retry threshold", async () => {
    publisher.reTry = 5;
    sinon.stub(publisher, "setDelay").resolves();
    const result = await publisher.delayRetry();
    expect(result).to.be.true;
    expect(publisher.reTry).to.equal(6);
  });

  it("should call publish with eventName and data in setDelay", async () => {
    const sleepStub = sinon.stub(publisher, "sleep").resolves();
    await publisher.setDelay(500);
    expect(publishStub.calledOnceWith("testEvent", { some: "data" })).to.be
      .true;
  });
});
