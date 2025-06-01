const dbFunctionHooks = [];
const dbFunctionInstanceHooks = [];
const dbFunctionPreHooks = [];
const dbFunctionPostHooks = [];
const dbFunctionWhereClauseHooks = [];
const dbFunctionDataClauseHooks = [];

const registerDbFunctionPreHookForRoute = (routeName, hookCall) => {
  dbFunctionPreHooks.push({
    routeName: routeName,
    hook: hookCall,
  });
};

const registerDbFunctionPostHookForRoute = (routeName, hookCall) => {
  dbFunctionPostHooks.push({
    routeName: routeName,
    hook: hookCall,
  });
};

const registerDbFunctionHookForRoute = (routeName, hookCall) => {
  dbFunctionHooks.push({
    routeName: routeName,
    hook: hookCall,
  });
};

const registerDbFunctionWhereClauseHookForRoute = (routeName, hookCall) => {
  dbFunctionWhereClauseHooks.push({
    routeName: routeName,
    hook: hookCall,
  });
};

const registerDbFunctionDataClauseHookForRoute = (routeName, hookCall) => {
  dbFunctionDataClauseHooks.push({
    routeName: routeName,
    hook: hookCall,
  });
};

const registerDbFunctionInstanceHookForRoute = (routeName, hookCall) => {
  dbFunctionInstanceHooks.push({
    routeName: routeName,
    hook: hookCall,
  });
};

const getDbFunctionPreHooks = (routeName) => {
  const result = dbFunctionPreHooks.filter(
    (hookObj) => hookObj.routeName == routeName,
  );
  return result.map((hookObj) => hookObj.hook);
};

const getDbFunctionPostHooks = (routeName) => {
  const result = dbFunctionPostHooks.filter(
    (hookObj) => hookObj.routeName == routeName,
  );
  return result.map((hookObj) => hookObj.hook);
};

const getDbFunctionHook = (routeName) => {
  const result = dbFunctionHooks.filter(
    (hookObj) => hookObj.routeName == routeName,
  );
  if (result.length > 0) return result[0].hook;
  return null;
};

const getDbFunctionInstanceHook = (routeName) => {
  const result = dbFunctionInstanceHooks.filter(
    (hookObj) => hookObj.routeName == routeName,
  );
  if (result.length > 0) return result[0].hook;
  return null;
};

const getDbFunctionWhereClauseHook = (routeName) => {
  const result = dbFunctionWhereClauseHooks.filter(
    (hookObj) => hookObj.routeName == routeName,
  );
  if (result.length > 0) return result[0].hook;
  return null;
};

const getDbFunctionDataClauseHook = (routeName) => {
  const result = dbFunctionDataClauseHooks.filter(
    (hookObj) => hookObj.routeName == routeName,
  );
  if (result.length > 0) return result[0].hook;
  return null;
};

module.exports = {
  getDbFunctionHook,
  getDbFunctionInstanceHook,
  getDbFunctionPreHooks,
  getDbFunctionPostHooks,
  getDbFunctionWhereClauseHook,
  getDbFunctionDataClauseHook,
  registerDbFunctionPreHookForRoute,
  registerDbFunctionPostHookForRoute,
  registerDbFunctionHookForRoute,
  registerDbFunctionWhereClauseHookForRoute,
  registerDbFunctionDataClauseHookForRoute,
  registerDbFunctionInstanceHookForRoute,
};
