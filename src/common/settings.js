module.exports = {
  smtpEmailPort: Number(process.env.SMTP_EMAIL_PORT ?? 465),
  smtpEmailHost: process.env.SMTP_EMAIL_HOST ?? "smtp.zoho.eu",
  smtpEmailUser: process.env.SMTP_EMAIL_USER ?? "hexauser.dev@zohomail.eu",
  smtpEmailPass: process.env.SMTP_EMAIL_PASS ?? "hexauser.2023",
  smtpEmailFrom: process.env.SMTP_EMAIL_FROM ?? "hexauser.dev@zohomail.eu",
};
