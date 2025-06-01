const { getDbFunctionPreHooks, getDbFunctionPostHooks } = require("./db-hooks");

const runPreHooks = async (functionName, input) => {
  const preHooks = getDbFunctionPreHooks(functionName);
  for (const hook of preHooks) {
    const result = await hook(input);
    if (result instanceof Error) {
      return result;
    }
  }
};

const runPostHooks = async (functionName, data) => {
  const postHooks = getDbFunctionPostHooks(functionName);
  for (const hook of postHooks) {
    const result = await hook(input, data);
    if (result instanceof Error) {
      return result;
    }
  }
};

module.exports = { runPreHooks, runPostHooks };
