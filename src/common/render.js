const ejs = require("ejs");
const fs = require("fs");

const renderTemplate = async (template, data) => {
  let source = null;
  if (!fs.existsSync(template)) {
    const stdTemplate = `<%- 
      JSON.stringify(
        {
            message:"Template not found, data is printed as JSON", 
            data:locals
        },
        null,
        2); 
    %>`;
    source = await ejs.render(stdTemplate, data);
  } else {
    source = await ejs.renderFile(template, data);
  }
  return source;
};

const renderTemplateSource = (template, data) => {
  if (!template) {
    template = `<%- 
      JSON.stringify(
        {
            message:"Template not found, data is printed as JSON", 
            data:locals
        },
        null,
        2);
    %>`;
  }
  return ejs.render(template, data);
};

module.exports = { renderTemplate, renderTemplateSource };
