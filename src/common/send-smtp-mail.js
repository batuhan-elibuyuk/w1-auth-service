var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

const {
  smtpEmailFrom,
  smtpEmailPort,
  smtpEmailHost,
  smtpEmailUser,
  smtpEmailPass,
} = require("./settings");

const sendSmptEmail = async (input) => {
  var transporter = nodemailer.createTransport(
    smtpTransport({
      host: smtpEmailHost,
      port: smtpEmailPort,
      secure: true,
      auth: {
        user: smtpEmailUser,
        pass: smtpEmailPass,
      },
    }),
  );

  var mailOptions = {
    from: input.emailFrom ?? smtpEmailFrom ?? smtpEmailUser,
    to: input.to,
    subject: input.subject,
    text: input.body,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log("EMAIL SEND ERROR...", err);
  }
};

module.exports = sendSmptEmail;
