const chai = require("chai");
const sinon = require("sinon");
const nodemailer = require("nodemailer");
const proxyquire = require("proxyquire");
const sendSmptEmail = require("../../src/common/send-smtp-mail");
const { expect } = chai;

describe("sendSmptEmail", () => {
  let createTransportStub;
  let sendMailStub;

  beforeEach(() => {
    sendMailStub = sinon.stub().resolves("Email sent");
    createTransportStub = sinon
      .stub(nodemailer, "createTransport")
      .returns({ sendMail: sendMailStub });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should call nodemailer.sendMail with correct parameters", async () => {
    const input = {
      emailFrom: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      body: "Test Body",
    };

    await sendSmptEmail(input);

    const transport = createTransportStub.returnValues[0];
    const sendMailCall = transport.sendMail;

    expect(sendMailCall.calledOnce).to.be.true;
    expect(sendMailCall.firstCall.args[0]).to.deep.include({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      text: "Test Body",
    });
  });

  it("should use default settings when emailFrom is not provided", async () => {
    const input = {
      to: "recipient@example.com",
      subject: "Test Subject",
      body: "Test Body",
    };

    await sendSmptEmail(input);

    const transport = createTransportStub.returnValues[0];
    const sendMailCall = transport.sendMail;

    expect(sendMailCall.calledOnce).to.be.true;
    expect(sendMailCall.firstCall.args[0].from).to.equal(
      process.env.SMTP_EMAIL_FROM || "hexauser.dev@zohomail.eu",
    );
  });

  it("should log error if sendMail fails", async () => {
    const consoleStub = sinon.stub(console, "log");
    sendMailStub.rejects(new Error("Send email error"));

    const input = {
      emailFrom: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test",
      body: "Body",
    };

    await sendSmptEmail(input);
    expect(consoleStub.calledWithMatch("EMAIL SEND ERROR")).to.be.true;

    consoleStub.restore();
  });

  it("should not fail if body is missing", async () => {
    const input = {
      to: "recipient@example.com",
      subject: "No Body Email",
    };

    await sendSmptEmail(input);

    const mailArgs =
      createTransportStub.returnValues[0].sendMail.firstCall.args[0];
    expect(mailArgs.text).to.be.undefined;
  });

  it("should fallback to smtpEmailUser when smtpEmailFrom and input.emailFrom are not provided", async () => {
    const sendMailStub = sinon.stub().resolves("Email sent");
    const createTransportStub = sinon
      .stub()
      .returns({ sendMail: sendMailStub });

    const sendSmtpEmail = proxyquire("../../src/common/send-smtp-mail", {
      "./settings": {
        smtpEmailFrom: null,
        smtpEmailUser: "user@example.com",
        smtpEmailPass: "pass",
        smtpEmailHost: "smtp.test.com",
        smtpEmailPort: 465,
      },
      nodemailer: {
        createTransport: createTransportStub,
      },
    });

    const input = {
      to: "recipient@example.com",
      subject: "Fallback From",
      body: "Test",
    };

    await sendSmtpEmail(input);

    expect(createTransportStub.calledOnce).to.be.true;
    const sendArgs = sendMailStub.firstCall.args[0];
    expect(sendArgs.from).to.equal("user@example.com");
  });
});
