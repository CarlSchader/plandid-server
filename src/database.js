const { MongoClient } = require('mongodb');

const config = JSON.parse(require("fs").readFileSync("./config.json"));
const mongodbConfig = config.mongodbConfig;

const client = new MongoClient(mongodbConfig.uri, {useNewUrlParser: true, useUnifiedTopology: true});

module.exports = {
    db: client.db(mongodbConfig.databaseName),
    connectDatabase: async function() {
        try {
            await client.connect();
            return true;
        }
        catch (error) {
            console.error(error);
            return false;
        }
    }
}