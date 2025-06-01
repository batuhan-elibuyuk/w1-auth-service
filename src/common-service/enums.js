const { redisClient } = require("common");
const ElasticIndexer = require("./service-indexer");

const EnumDictionaries = {
  default: {
    testId: "testName",
  },
};

const getEnumValueFromLocalDict = async (id, enumDict, hasDesc) => {
  if (Array.isArray(id)) {
    const results = [];
    for (const idItem of id) {
      const nResult = EnumDictionaries[enumDict]?.[idItem.toString()];
      const dResult = hasDesc
        ? EnumDictionaries[enumDict + "_desc"]?.[idItem.toString()]
        : undefined;
      if (nResult == null) return null;
      results.push({ id: idItem, name: nResult, desc: dResult });
    }
    return results;
  } else {
    const nResult = EnumDictionaries[enumDict]?.[id.toString()];
    const dResult = hasDesc
      ? EnumDictionaries[enumDict + "_desc"]?.[id.toString()]
      : undefined;
    return { id: id, name: nResult, desc: dResult };
  }
};

const getEnumValueFromRedisDict = async (id, enumDict, hasDesc) => {
  if (Array.isArray(id)) {
    const nPromises = [];
    const dPromises = [];
    for (const idItem of id) {
      if (idItem == null) {
        nPromises.push(redisClient.hGet(enumDict, "nullx"));
        if (hasDesc)
          dPromises.push(redisClient.hGet(enumDict + "_desc", "nullx"));
      } else {
        nPromises.push(redisClient.hGet(enumDict, idItem.toString()));
        if (hasDesc)
          dPromises.push(
            redisClient.hGet(enumDict + "_desc", idItem.toString()),
          );
      }
    }
    let nResults = await Promise.all(nPromises);
    let dResults = hasDesc ? await Promise.all(dPromises) : null;
    for (const result of nResults) {
      if (result == null) return null;
    }
    const results = [];
    for (const [index, name] of nResults.entries()) {
      results.push({
        id: id[index],
        name: name,
        desc: hasDesc ? dResults[index] : undefined,
      });
    }
    return results;
  } else {
    const nResult = await redisClient.hGet(enumDict, id.toString());
    const dResult = hasDesc
      ? await redisClient.hGet(enumDict + "_desc", id.toString())
      : undefined;
    return {
      id: id,
      name: nResult,
      desc: dResult,
    };
  }
};

const getEnumValueFromElasticDict = async (id, enumDict, hasDesc) => {
  const elasticIndex = new ElasticIndexer(enumDict);
  const result = await elasticIndex.getDataById(id);
  if (!result) return null;
  if (Array.isArray(id)) {
    const results = [];
    for (const idItem of id) {
      const resultItem = result.find(
        (resItem) => resItem && resItem.id == idItem,
      );
      results.push({
        id: idItem,
        name: resultItem?.name ?? resultItem?.value,
        desc: hasDesc ? resultItem?.desc : undefined,
      });
    }
    return results;
  } else {
    return {
      id: id,
      name: result?.name ?? result?.value,
      desc: hasDesc ? result?.desc : undefined,
    };
  }
};

const getEnumValue = async (id, enumDict, hasDesc) => {
  if (id === null || id === undefined) return null;
  if (Array.isArray(id) && !id.length) return [];
  const resultLocal = await getEnumValueFromLocalDict(id, enumDict, hasDesc);
  if (
    (Array.isArray(resultLocal) && resultLocal.length) ||
    (!Array.isArray(resultLocal) && resultLocal?.name)
  )
    return resultLocal;

  const resultRedis = await getEnumValueFromRedisDict(id, enumDict, hasDesc);
  if (
    (Array.isArray(resultRedis) && resultRedis.length) ||
    (!Array.isArray(resultRedis) && resultRedis?.name)
  )
    return resultRedis;

  const resultElastic = await getEnumValueFromElasticDict(
    id,
    enumDict,
    hasDesc,
  );
  if (
    (Array.isArray(resultElastic) && resultElastic.length) ||
    (!Array.isArray(resultElastic) && resultElastic?.name)
  )
    return resultElastic;

  return Array.isArray(id) ? [] : null;
};

const loadEnumDictionary = async (enumDict, hasDesc) => {
  const elasticIndex = new ElasticIndexer(enumDict);

  const data =
    (await elasticIndex.getDataByPage(0, 10000, null, null, false)) ?? [];
  data.unshift(
    {
      id: "testId1",
      name: "testName1",
      desc: hasDesc ? "testDesc1" : undefined,
    },
    {
      id: "testId2",
      name: "testName2",
      desc: hasDesc ? "testDesc2" : undefined,
    },
  );
  const tuples = [];
  const dTuples = [];
  EnumDictionaries[enumDict] = {};
  if (hasDesc) EnumDictionaries[enumDict + "_desc"] = {};
  for (const item of data) {
    tuples.push([
      item.id.toString(),
      item.name ?? item.value ?? item.desc ?? "null",
    ]);
    if (hasDesc) dTuples.push([item.id.toString(), item.desc]);
    EnumDictionaries[enumDict][item.id.toString()] =
      item.name ?? item.value ?? item.desc ?? null;
    if (hasDesc)
      EnumDictionaries[enumDict + "_desc"][item.id.toString()] = item.desc;
  }
  await redisClient.hSet(enumDict, tuples);
  if (hasDesc) await redisClient.hSet(enumDict + "_desc", dTuples);
};

module.exports = { getEnumValue, loadEnumDictionary };
