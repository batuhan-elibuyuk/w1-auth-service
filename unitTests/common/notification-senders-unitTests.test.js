const { expect } = require("chai");
const sinon = require("sinon");
const {
  NotificationSender,
  EmailSender,
  SmsSender,
  DataSender,
} = require("../../src/common");

describe("NotificationSenders", () => {
  describe("NotificationSender", () => {
    let notificationSender;

    beforeEach(() => {
      const header = {
        eventTime: "2025-01-30T10:00:00Z",
        eventName: "Test Event",
        eventUser: "testUser",
        actionName: "Test Action",
        actionUrl: "http://example.com",
        actionConfig: {},
      };
      const messageBody = "Test Notification";
      const jobId = "job123";
      notificationSender = new NotificationSender(header, messageBody, jobId);
    });

    it("should initialize properties correctly", () => {
      expect(notificationSender.body).to.equal("Test Notification");
      expect(notificationSender.eventTime).to.equal("2025-01-30T10:00:00Z");
      expect(notificationSender.eventName).to.equal("Test Event");
      expect(notificationSender.eventUser).to.equal("testUser");
      expect(notificationSender.actionName).to.equal("Test Action");
      expect(notificationSender.actionUrl).to.equal("http://example.com");
    });

    it("should call send method", async () => {
      const sendStub = sinon
        .stub(notificationSender, "send")
        .resolves("Notification sent successfully");

      const result = await notificationSender.send();

      expect(sendStub.calledOnce).to.be.true;
      expect(result).to.equal("Notification sent successfully");

      sendStub.restore();
    });

    it("should call markDone method", async () => {
      const markDoneStub = sinon
        .stub(notificationSender, "markDone")
        .resolves("Notification marked as done");

      const result = await notificationSender.markDone();

      expect(markDoneStub.calledOnce).to.be.true;
      expect(result).to.equal("Notification marked as done");

      markDoneStub.restore();
    });
  });

  describe("EmailSender", () => {
    let emailSender;

    beforeEach(() => {
      const header = {
        eventTime: "2025-01-30T10:00:00Z",
        eventName: "Test Event",
        eventUser: "testUser",
        actionName: "Test Action",
        actionUrl: "http://example.com",
        actionConfig: {},
      };
      const messageBody = {
        subject: "Test Email",
        body: "This is a test email.",
        to: "test@example.com",
        from: "noreply@example.com",
        cc: ["cc@example.com"],
        bcc: ["bcc@example.com"],
      };
      const jobId = "job123";
      emailSender = new EmailSender(header, messageBody, jobId);
    });

    it("should initialize properties correctly", () => {
      expect(emailSender.subject).to.equal("Test Email");
      expect(emailSender.body).to.equal("This is a test email.");
      expect(emailSender.to).to.equal("test@example.com");
      expect(emailSender.from).to.equal("noreply@example.com");
      expect(emailSender.type).to.equal("email");
    });

    it("should call send method", async () => {
      const sendStub = sinon
        .stub(emailSender, "send")
        .resolves("Email sent successfully");

      const result = await emailSender.send();

      expect(sendStub.calledOnce).to.be.true;
      expect(result).to.equal("Email sent successfully");

      sendStub.restore();
    });

    it("should call markDone method", async () => {
      const markDoneStub = sinon
        .stub(emailSender, "markDone")
        .resolves("Notification marked as done");

      const result = await emailSender.markDone();

      expect(markDoneStub.calledOnce).to.be.true;
      expect(result).to.equal("Notification marked as done");

      markDoneStub.restore();
    });
  });

  describe("SmsSender", () => {
    let smsSender;

    beforeEach(() => {
      const header = {
        eventTime: "2025-01-30T10:00:00Z",
        eventName: "Test Event",
        eventUser: "testUser",
        actionName: "Test Action",
        actionUrl: "http://example.com",
        actionConfig: {},
      };
      const messageBody = {
        text: "This is a test SMS.",
        to: "1234567890",
        from: "9876543210",
      };
      const jobId = "job123";
      smsSender = new SmsSender(header, messageBody, jobId);
    });

    it("should initialize properties correctly", () => {
      expect(smsSender.text).to.equal("This is a test SMS.");
      expect(smsSender.to).to.equal("1234567890");
      expect(smsSender.from).to.equal("9876543210");
      expect(smsSender.type).to.equal("sms");
    });

    it("should call send method", async () => {
      const sendStub = sinon
        .stub(smsSender, "send")
        .resolves("SMS sent successfully");

      const result = await smsSender.send();

      expect(sendStub.calledOnce).to.be.true;
      expect(result).to.equal("SMS sent successfully");

      sendStub.restore();
    });

    it("should call markDone method", async () => {
      const markDoneStub = sinon
        .stub(smsSender, "markDone")
        .resolves("Notification marked as done");

      const result = await smsSender.markDone();

      expect(markDoneStub.calledOnce).to.be.true;
      expect(result).to.equal("Notification marked as done");

      markDoneStub.restore();
    });
  });

  describe("DataSender", () => {
    let dataSender;

    beforeEach(() => {
      const header = {
        eventTime: "2025-01-30T10:00:00Z",
        eventName: "Test Event",
        eventUser: "testUser",
        actionName: "Test Action",
        actionUrl: "http://example.com",
        actionConfig: {},
        targetUser: "user123",
      };
      const messageBody = {
        data: { key: "value" },
      };
      const jobId = "job123";
      dataSender = new DataSender(header, messageBody, jobId);
    });

    it("should initialize properties correctly", () => {
      expect(dataSender.data).to.deep.equal({ key: "value" });
      expect(dataSender.targetUser).to.equal("user123");
      expect(dataSender.type).to.equal("data");
    });

    it("should call send method", async () => {
      const sendStub = sinon
        .stub(dataSender, "send")
        .resolves("Data sent successfully");

      const result = await dataSender.send();

      expect(sendStub.calledOnce).to.be.true;
      expect(result).to.equal("Data sent successfully");

      sendStub.restore();
    });

    it("should call markDone method", async () => {
      const markDoneStub = sinon
        .stub(dataSender, "markDone")
        .resolves("Notification marked as done");

      const result = await dataSender.markDone();

      expect(markDoneStub.calledOnce).to.be.true;
      expect(result).to.equal("Notification marked as done");

      markDoneStub.restore();
    });
  });
});
