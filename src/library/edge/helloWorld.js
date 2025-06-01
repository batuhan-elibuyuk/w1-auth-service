module.exports = async (request) => {
  return {
    status: 200,
    message: "Hello from the edge function",
    date: new Date().toISOString(),
  };
};
