const cron = require("node-cron");

const syncElasticIndexData = require("./syncElasticData");

const startRepairElastic = async () => {
  try {
    await syncElasticIndexData();
  } catch (err) {
    console.log("Error while syncing Elastic Index Data", err);
  }

  cron.schedule("0 0 * * * *", async () => {
    console.group("Cron Job Started", new Date());
    // Snycing Elastic Index Data
    await syncElasticIndexData();
    console.groupEnd();
  });
};

module.exports = { startRepairElastic };
