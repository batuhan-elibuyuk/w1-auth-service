const boolParser = (req, res, next) => {
  const query = req.query;
  if (query) {
    for (const key of Object.keys(query)) {
      const value = query[key];
      if (value === "true") query[key] = true;
      if (value === "false") query[key] = false;
    }
  }
  next();
};

module.exports = boolParser;
