const { MongoClient } = require('mongodb');

const {mongodbConfig} = JSON.parse(require("fs").readFileSync("./config.json"));

(async function() {
    const client = new MongoClient(mongodbConfig.uri, {useNewUrlParser: true, useUnifiedTopology: true});

    await client.connect();
    const db = client.db(mongodbConfig.databaseName);

    await db.dropDatabase();

    await client.close();

    console.log(`Database ${mongodbConfig.databaseName} has been deleted.`)
    process.exit(0);
})()