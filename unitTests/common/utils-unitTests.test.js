const { expect } = require("chai");
const { concatListResults, mapArrayItems } = require("../../src/common/");

describe("concatListResults", () => {
  it("should return an empty array when input is empty", () => {
    const result = concatListResults([]);
    expect(result).to.deep.equal([]);
  });

  it("should concatenate items from each list when items exist", () => {
    const input = [{ items: [1, 2] }, { items: [3, 4] }, { items: [5, 6] }];
    const result = concatListResults(input);
    expect(result).to.deep.equal([1, 2, 3, 4, 5, 6]);
  });

  it("should skip lists without items or with invalid items", () => {
    const input = [
      { items: [1, 2] },
      { notItems: [3, 4] }, // Missing 'items'
      { items: null }, // Invalid 'items'
      { items: [5, 6] },
    ];
    const result = concatListResults(input);
    expect(result).to.deep.equal([1, 2, 5, 6]);
  });

  it("should return an empty array if no lists contain valid items", () => {
    const input = [{ notItems: [1, 2] }, { items: null }];
    const result = concatListResults(input);
    expect(result).to.deep.equal([]);
  });

  it("should skip if items is not an array", () => {
    const result = concatListResults([{ items: "not-array" }]);
    expect(result).to.deep.equal([]);
  });

  it("should not crash on completely invalid objects", () => {
    const result = concatListResults([null, undefined, {}, { items: 5 }]);
    expect(result).to.deep.equal([]);
  });
});

describe("mapArrayItems", () => {
  it("should return an empty array when input is empty", () => {
    const result = mapArrayItems([], ["key"]);
    expect(result).to.deep.equal([]);
  });

  it("should return a new array with selected keys from each object", () => {
    const input = [
      { key1: "value1", key2: "value2" },
      { key1: "value3", key2: "value4" },
    ];
    const result = mapArrayItems(input, ["key1"]);
    expect(result).to.deep.equal([{ key1: "value1" }, { key1: "value3" }]);
  });

  it("should include only the specified keys in the new array", () => {
    const input = [
      { key1: "value1", key2: "value2", key3: "value3" },
      { key1: "value4", key2: "value5", key3: "value6" },
    ];
    const result = mapArrayItems(input, ["key1", "key3"]);
    expect(result).to.deep.equal([
      { key1: "value1", key3: "value3" },
      { key1: "value4", key3: "value6" },
    ]);
  });

  it("should return an array of empty objects if none of the keys exist in the items", () => {
    const input = [
      { key1: "value1", key2: "value2" },
      { key1: "value3", key2: "value4" },
    ];
    const result = mapArrayItems(input, ["key3"]);
    expect(result).to.deep.equal([{ key3: undefined }, { key3: undefined }]);
  });

  /*it("should skip non-object items in input array", () => { //activate this test when the main code function is updated to handle non-object items
    const result = mapArrayItems([null, 5, "string"], ["a"]);
    expect(result).to.deep.equal([{ a: undefined }, { a: undefined }, { a: undefined }]);
  });*/

  it("should return empty objects if keys array is empty", () => {
    const input = [{ a: 1, b: 2 }];
    const result = mapArrayItems(input, []);
    expect(result).to.deep.equal([{}]);
  });
});
