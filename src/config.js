const {millisecondMap} = require("./constants");

module.exports = {
    appName: 'Plandid',
    sslCertificatePath: "/etc/letsencrypt/live/plandid.app/fullchain.pem",
    sslKeyPath: "/etc/letsencrypt/live/plandid.app/privkey.pem",
    port: 80,
    url: 'http://carlschader.com',
    clientBuildPath: require('path').join(__dirname, 'client', 'build'),
    indexHTMLPath: require('path').join(__dirname, 'client', 'build', 'index.html'),
    maintenanceHTMLPath: require('path').join(__dirname, 'client', "public" ,'maintenance.html'),
    sessionSecret: [...Array(10)].map(i=>[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"][Math.random()*[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].length|0]).join``,
    
    mongodbConfig: {
		username: 'SchedulerUser',
		password: 'RedGreenBlue@1',
		uri: 'mongodb+srv://SchedulerUser:RedGreenBlue@1@schedulercluster-7jjoi.mongodb.net/Scheduler?retryWrites=true&w=majority',
        databaseName: 'Scheduler',
        idLength: 24,
        collectionNames: {
            userData: 'UserData',
            emailValidation: 'EmailValidation',
            schedule: 'Schedule',
            // exceptions: 'Exceptions',
            people: 'People',
            categories: 'Categories',
            events: 'Events',
            plans: 'Plans',
            // tasks: 'Tasks',
            // week: 'Week',
            online: 'Online',
            stripe: "Stripe"
        }
    },

    stripe: {
        privateKey: "sk_test_51Hn4uCG2wnzRPq5Y3MC6nkDTUJ2cE98LGQQeDm3bMvSRG23pECMBmJOlRSXz1Xxw7y6rO3NkHrrYhjwoZiiUkhTz00fvEHUPHL",
        priceKeys: {
            free: null,
            premium: "price_1Hq62ZG2wnzRPq5Ya4OBshUo"
        },
        webhookSecret: "whsec_AuuX1bwLn6ptrxDVCDdhvUxhttrhjfCy"
    },

    emailConfig: {
        service: 'gmail',
        address: 'carlwschader@gmail.com',
        password: 'dncrqgxuljgkhgms'
    },

    lookBackMillis: 14 * millisecondMap.day,

    freeTierName: "free",
    tiers: {
        free: {
            price: 0.0,
            forwardMillis: 31 * millisecondMap.day,
            storageMillis: 14 * millisecondMap.day
        },
        premium: {
            price: 9.99,
            forwardMillis: 31 * 6 * millisecondMap.day,
            storageMillis: 365 * 2 * millisecondMap.day
        }
    }
};
