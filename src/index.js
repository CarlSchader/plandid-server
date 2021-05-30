(async function() {
    const https = require("https");
    const http = require("http");
    const express = require('express');
    const path = require('path');
    const fs = require("fs");
    const bodyParser = require("body-parser");
    const cors = require('cors');
    const session = require('express-session');
    const db = require('./database');

    const config = JSON.parse(fs.readFileSync("./config.json"));

    // Connect to database
    await db.connect();

    let app = express();

    // Middleware

    // CORS Module
    const corsOptions = {
        origin: function(origin, callback) {
            if (config.corsWhitelist.indexOf(origin) !== -1 || !origin) {
                callback(null, true);
            }
            else {
                callback(new Error(`${origin}: Not allowed by CORS`));
            }
        },
        credentials: true,
        maxAge: 86400,
        optionsSuccessStatus: 200
    };

    app.use(cors(corsOptions));
    
    // Webhooks go here. (notice this is before bodyParser.)
    app.use("/webhooks", require("./routes/webhooks"));
    
    app.use(bodyParser.json());
    app.use(express.urlencoded({extended: false}));

    // Cookies for remembering session
    // app.set("trust proxy", 1);
    app.use(session({
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: true,
        cookie: { 
            secure: config.isHttps,
            maxAge: 21600000, // 6 hours
            sameSite: true,
            httpOnly: true
        }
    }));
    
    ///// FOR DEVELOPMENT, REMOVE WHEN IN PRODUCTION
    app.use((req, res, next) => {
        console.log(req.originalUrl);
        next();
    });
    /////

    // Routes

    app.options('*', cors(corsOptions));

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
        return res.sendFile(path.join(config.clientBuildPath, "index.html"));
    });

    app.get('*', function(req, res) {
        res.sendFile(path.join(config.clientBuildPath, req.url), function(error) {
            if (error) {
                return res.sendFile(path.join(config.clientBuildPath, "index.html"));
            }
        });
    });

    if (config.isHttps) {
        const httpsOptions = {
            key: fs.readFileSync(config.sslKeyPath),
            cert: fs.readFileSync(config.sslCertificatePath)
        };
        https.createServer(httpsOptions, app).listen(config.port);
        http.createServer(express().use((req, res) => res.redirect(config.url))).listen(80);
    }
    else {
        http.createServer(app).listen(config.port);
    }

    console.log(`${config.appName} Web Server running on port: ${config.port}`);
})();
