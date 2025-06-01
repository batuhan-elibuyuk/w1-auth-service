class NotificationSender {
  constructor(header, messageBody, jobId) {
    this.body = messageBody;
    this.header = header;
    this.jobId = jobId;
    this.eventTime = header.eventTime;
    this.eventName = header.eventName;
    this.eventUser = header.eventUser;
    this.actionName = header.actionName;
    this.actionUrl = header.actionUrl;
    this.actionConfig = header.actionConfig;
  }
  async send() {}
  async markDone() {}
}

class EmailSender extends NotificationSender {
  constructor(header, messageBody, jobId) {
    super(header, messageBody, jobId);
    this.type = "email";
    this.subject = messageBody.subject ?? "Subject Is Not Defined";
    this.body = messageBody.body ?? "Message Body";
    this.to = messageBody.to;
    this.from = messageBody.from;
    this.cc = messageBody.cc;
    this.bcc = messageBody.bcc;
  }
  async send() {}
}

class SmsSender extends NotificationSender {
  constructor(header, messageBody, jobId) {
    super(header, messageBody, jobId);
    this.type = "sms";
    this.to = messageBody.to;
    this.text = messageBody.text;
    this.from = messageBody.from;
  }
  async send() {}
}

class DataSender extends NotificationSender {
  constructor(header, messageBody, jobId) {
    super(header, messageBody, jobId);
    this.isDataSender = true;
    this.type = "data";
    this.targetUser = header?.targetUser;
    this.data = messageBody?.data ?? messageBody;
  }
  async send() {}
}

module.exports = { NotificationSender, EmailSender, SmsSender, DataSender };
