const express = require('express');
const db = require('../database')
const router = express.Router();

// userID, scheduleName
router.post("/getSchedule", async function(req, res) {
    return res.json(await db.readScheduleRecord(req.body.userID, req.body.scheduleName));
});

// userID, oldScheduleName, newScheduleName
router.post("/renameSchedule", async function(req, res) {
    let newName = req.body.newScheduleName.trim();
    if (newName.length < 1) {
        return res.json(1);
    }

    let scheduleRecord = await db.readScheduleRecord(req.body.userID, newName);
    if (scheduleRecord !== null) {
        return res.json(2);
    }

    await db.changeScheduleName(req.body.userID, req.body.oldScheduleName, newName);
    await db.changeUserDataLastUsedSchedule(req.body.userID, newName);
    return res.json(0);
});

module.exports = router;