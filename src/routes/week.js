const express = require('express');
const { mongodbConfig } = require('../config');
const db = require('../database');

const router = express.Router();

// userID, scheduleName
router.post("/getWeek", async function(req, res) {
    return res.json((await db.readWeekRecord(req.body.userID, req.body.scheduleName)).week);
});

// userID, scheduleName, utcStart, utcEnd, taskName
router.post("/addJob", async function(req, res) {
    let tasks = (await db.readTasksRecord(req.body.userID, req.body.scheduleName)).tasks;
    if (!(req.body.taskName in tasks)) {
        return res.json(1);
    }
    else {
        await db.addWeekJob(req.body.userID, req.body.scheduleName, req.body.utcStart, req.body.utcEnd, req.body.taskName, tasks[req.body.taskName]);
        return res.json(0);
    }
});

// userID, scheduleName, index
router.post("/removeJob", async function(req, res) {
    await db.removeWeekJob(req.body.userID, req.body.scheduleName, req.body.index);
    return res.json(0);
});

module.exports = router;