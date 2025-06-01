const concatListResults = (listArray) => {
  let result = [];
  for (const list of listArray) {
    if (list && list.items && Array.isArray(list.items)) {
      result = result.concat(list.items);
    }
  }
  return result;
};

const mapArrayItems = (itemArray, keys) => {
  return itemArray.map((item) => {
    const nItem = {};
    for (const key of keys) {
      nItem[key] = item[key];
    }
    return nItem;
  });
};

module.exports = { concatListResults, mapArrayItems };
