const { expect } = require("chai");
const sinon = require("sinon");
const fs = require("fs");
const ejs = require("ejs");
const { renderTemplate, renderTemplateSource } = require("../../src/common/");

describe("EJS Template Rendering", () => {
  const testData = { name: "John Doe", age: 30 };
  const templatePath = "test-template.ejs";
  const templateString = "Hello, <%= name %>!";
  const expectedOutput = "Hello, John Doe!";
  const defaultJsonOutput = JSON.stringify(
    { message: "Template not found, data is printed as JSON", data: testData },
    null,
    2,
  );

  beforeEach(() => {
    sinon.stub(fs, "existsSync");
    sinon.stub(ejs, "renderFile").resolves(expectedOutput);
    sinon.stub(ejs, "render").callsFake((template, data) => {
      if (template.includes("Template not found")) {
        return JSON.stringify(
          { message: "Template not found, data is printed as JSON", data },
          null,
          2,
        );
      }
      return expectedOutput;
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("renderTemplate", () => {
    it("should render a template from file if it exists", async () => {
      fs.existsSync.returns(true);

      const result = await renderTemplate(templatePath, testData);

      expect(ejs.renderFile.calledOnceWithExactly(templatePath, testData)).to.be
        .true;
      expect(result).to.equal(expectedOutput);
    });

    it("should render a default JSON response if file does not exist", async () => {
      fs.existsSync.returns(false);

      const result = await renderTemplate(templatePath, testData);

      expect(result).to.include("Template not found, data is printed as JSON");
      expect(result).to.include('"name": "John Doe"');
    });
  });

  describe("renderTemplateSource", () => {
    it("should render a given template string with provided data", () => {
      const result = renderTemplateSource(templateString, testData);

      expect(ejs.render.calledOnceWithExactly(templateString, testData)).to.be
        .true;
      expect(result).to.equal(expectedOutput);
    });

    it("should render default JSON output if no template is provided", () => {
      const result = renderTemplateSource(null, testData);

      expect(result).to.include("Template not found, data is printed as JSON");
      expect(result).to.include('"name": "John Doe"');
    });
  });
});
