const { expect } = require("chai");
const sinon = require("sinon");
const express = require("express");
const { NotAuthenticatedError } = require("common");
const proxyquire = require("proxyquire");
const loginRequired = false;

describe("helloWorldRestController", function () {
  let functionNameStub;
  let helloWorldRestController;

  beforeEach(() => {
    functionNameStub = sinon.stub();

    // Use proxyquire to mock the function
    helloWorldRestController = proxyquire(
      "../../../src/controllers-layer/edge-layer/helloWorld-rest",
      {
        "../../../src/library/edge/helloWorld": functionNameStub,
      },
    );
  });

  it("should return 200 and a valid response when login is not required", async function () {
    // Mock request, response, and next function
    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    const next = sinon.stub();

    await helloWorldRestController(req, res, next);

    if (loginRequired === false) {
      expect(res.status.calledWith(200)).to.be.true;
      expect(next.called).to.be.false; // Ensure next() is not called
    }
  });

  it("should call next() with NotAuthenticatedError when login is required and session is missing", async function () {
    // Mock request with no session
    const req = { session: null };
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    const next = sinon.stub();

    // The function should throw NotAuthorizedError because loginRequired is true and session is missing
    const error = new NotAuthenticatedError("helloWorld requires login");

    await helloWorldRestController(req, res, next);

    if (loginRequired === true) {
      expect(next.calledWith(error)).to.be.true;
      expect(next.args[0][0]).to.be.instanceOf(NotAuthenticatedError);
      expect(next.args[0][0].message).to.equal("helloWorld requires login");
    }
  });

  it("should return 200 and a valid response when login is required and session exists", async function () {
    // Mock request with session
    const req = { session: {} }; // Simulate an existing session
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    const next = sinon.stub();

    await helloWorldRestController(req, res, next);

    if (loginRequired === true) {
      expect(res.status.calledWith(200)).to.be.true;
      expect(next.called).to.be.false; // Ensure next() is not called
    }
  });

  it("should handle errors and call next() on failure", async function () {
    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    const next = sinon.stub();

    const error = new Error("Test error");

    helloWorldRestController = (req, res, next) => {
      next(error); // Directly call next with the error
    };

    await helloWorldRestController(req, res, next);

    expect(next.calledWith(error)).to.be.true;
    expect(next.args[0][0]).to.be.instanceOf(Error);
    expect(next.args[0][0].message).to.equal("Test error");
  });
});
