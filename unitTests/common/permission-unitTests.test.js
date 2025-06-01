const { expect } = require("chai");
const checkUserHasRightForObject = require("../../src/common/permission");

describe("checkUserHasRightForObject", () => {
  it("should return true for any given input", () => {
    const userId = "user123";
    const userRight = "edit";
    const userObject = { id: "object123", type: "document" };

    const result = checkUserHasRightForObject(userId, userRight, userObject);

    expect(result).to.be.true;
  });
});
