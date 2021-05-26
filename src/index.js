(async function() {
    // const https = require("https");
    const http = require("http");
    const express = require('express');
    const path = require('path');
    const fs = require("fs");
    const bodyParser = require("body-parser");
    const cors = require('cors');
    const session = require('express-session');
    const config = require('./config');
    const db = require('./database');

    // const httpsOptions = {
    //     key: fs.readFileSync(config.sslKeyPath),
    //     cert: fs.readFileSync(config.sslCertificatePath)
    // };

    // Connect to database
    await db.connect();

    app = express();

    // Middleware
    app.use(cors({
        origin: true,
        credentials: true
    })); // These cors options are necessary to recieve cookies from axios.

    // // Custom CORS (not working)
    // app.options("/*", function(req, res, next){
    //     res.header('Access-Control-Expose-Headers', 'ETAG');
    //     res.header('Access-Control-Allow-Credentials', 'true');
    //     res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    //     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    //     res.header('Access-Control-Allow-Headers', '*');
    //     res.sendStatus(200);
    //   });
    
    // Webhooks go here. (notice this is before bodyParser.)
    app.use("/webhooks", require("./routes/webhooks"));
    
    app.use(bodyParser.json());
    app.use(express.urlencoded({extended: false}));
    app.use(session({
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false,
        maxAge: 6 * 60 * 60 * 1000,
        sameSite: 'lax'
        }
    }));
    
    ///// FOR DEVELOPMENT REMOVE IN PRODUCTION
    app.use((req, res, next) => {
        console.log(req.originalUrl);
        next();
    });
    /////

    // Routes

    // Public POST Routes
    app.use('/publicPost', require('./routes/publicPost'));

    // Private POST Routes Past this point
    app.post('*', async function(req, res, next) {
        if (req.session && req.session.sessionID) {
            let userID = await db.userIDfromSessionID(req.session.sessionID);
            if (userID !== null) {
                let userData = await db.readUserDataRecordFromID(userID);
                let scheduleName = userData.lastUsedSchedule;
                if (await db.readScheduleRecord(userID, scheduleName) === null) {
                    scheduleName = (await db.readRandomScheduleRecord(userID)).scheduleName;
                    await db.changeUserDataLastUsedSchedule(userID, scheduleName);
                }
                req.body.userID = userID;
                req.body.scheduleName = scheduleName;
                req.body.tier = userData.tier;
                return next();
            }
        }
        return res.json(-1);
    });

    app.use("/online", require("./routes/online"));
    app.use("/userData", require("./routes/userData"));
    app.use('/schedule', require('./routes/schedule'));
    app.use('/people', require('./routes/people'));
    app.use("/events", require("./routes/events"));
    app.use("/categories", require("./routes/categories"));
    app.use('/plans', require('./routes/plans'));
    app.use("/stripeRoutes", require("./routes/stripeRoutes"));

    // All GET Routes are public
    app.get('/', function(req, res) {
        return res.sendFile(config.indexHTMLPath);
    });

    app.get('*', function(req, res) {
        res.sendFile(path.join(config.clientBuildPath, req.url), function(error) {
            if (error) {
                return res.sendFile(config.indexHTMLPath);
            }
        });
    });

    // https.createServer(httpsOptions, app).listen(config.port);
    http.createServer(app).listen(config.port);

    console.log(`${config.appName} Web Server running on port: ${config.port}`);
})();
