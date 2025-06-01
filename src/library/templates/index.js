const fs = require("fs");
const path = require("path");

const getTemplate = (tempName) => {
  const templatePath = path.join(__dirname, tempName);
  const template = fs.readFileSync(templatePath, "utf8");
  return template;
};
module.exports = {
  serviceCrashedNotification: getTemplate("./serviceCrashedNotification.ejs"),
  welcomeMail: getTemplate("./welcomeMail.ejs"),
  simpleDownloadTemplate: getTemplate("./simpleDownloadTemplate.ejs"),
};
