const { MongoClient } = require('mongodb');

const {mongodbConfig} = JSON.parse(require("fs").readFileSync("./config.json"));
const schemas = JSON.parse(require("fs").readFileSync("./schemas.json"));
const indexes = JSON.parse(require("fs").readFileSync("./indexes.json"));

(async function() {
    const client = new MongoClient(mongodbConfig.uri, {useNewUrlParser: true, useUnifiedTopology: true});

    await client.connect();
    const db = client.db(mongodbConfig.databaseName);

    for (let schemaName in schemas) {
        await db.createCollection(schemaName, {
            validator: {
                $jsonSchema: schemas[schemaName]
            }
        });
    }

    for  (const collection in indexes) {
        for (const kvp of indexes[collection]) {
            await db.collection(collection).createIndex(kvp.index, kvp.options);
        }
    }

    await client.close();

    console.log(`Database ${mongodbConfig.databaseName} has been created.`);
    process.exit(0);
})()