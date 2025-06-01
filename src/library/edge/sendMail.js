const { sendSmptEmail } = require("common");
module.exports = async (request) => {
  const { to, subject, text } = request.body;
  const emailFrom = request.session?.email ?? "test@mindbricks.com";
  await sendSmptEmail({ emailFrom, to, subject, text });
  return { status: 201, message: "Email sent", date: new Date().toISOString() };
};
