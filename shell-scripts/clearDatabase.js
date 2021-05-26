const db = require('./database');
(async function() {
    await db.connect();
    await db.clearDatabase();
    console.log("Database cleared.\n");
    process.exit(0);
})();