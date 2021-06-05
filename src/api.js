const express = require('express');
const router = express.Router();

const config = JSON.parse(fs.readFileSync("./config.json"));

// Public Methods
app.use(require('./routes/public'));

// Check Credentials via SessionID Cookie
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

// Private Methods
app.use("/online", require("./routes/online"));
app.use("/userData", require("./routes/userData"));
app.use('/schedule', require('./routes/schedule'));
app.use('/people', require('./routes/people'));
app.use("/events", require("./routes/events"));
app.use("/categories", require("./routes/categories"));
app.use('/plans', require('./routes/plans'));
app.use("/stripeRoutes", require("./routes/stripeRoutes"));

module.exports = router;