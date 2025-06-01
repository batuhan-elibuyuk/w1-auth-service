const { expect } = require("chai");
const sinon = require("sinon");
const settings = require("../../src/common/settings");

describe("SMTP Settings", () => {
  let envStub;

  beforeEach(() => {
    envStub = sinon.stub(process, "env");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should use default values when environment variables are not set", () => {
    const smtpSettings = settings;

    expect(smtpSettings.smtpEmailPort).to.equal(465);
    expect(smtpSettings.smtpEmailHost).to.equal("smtp.zoho.eu");
    expect(smtpSettings.smtpEmailUser).to.equal("hexauser.dev@zohomail.eu");
    expect(smtpSettings.smtpEmailPass).to.equal("hexauser.2023");
    expect(smtpSettings.smtpEmailFrom).to.equal("hexauser.dev@zohomail.eu");
  });
});
