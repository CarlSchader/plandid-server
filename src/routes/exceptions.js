const express = require('express');
const db = require('../database');
const { validRange } = require('../utilities');
const {DateTime } = require("luxon");

const router = express.Router();

// userID, scheduleName
router.post("/getExceptions", async function(req, res) {
    res.json((await db.readExceptionsRecord(req.body.userID, req.body.scheduleName)).exceptions);
})

// userID, scheduleName, utcStart, utcEnd, description
router.post("/addException", async function(req, res) {
    console.log(DateTime.fromMillis(req.body.utcStart).toLocaleString(), DateTime.fromMillis(req.body.utcStart).toLocaleString(req.body.utcEnd))
    if (validRange({start: req.body.utcStart, end: req.body.utcEnd})) {
        await db.addException(req.body.userID, req.body.scheduleName, req.body.utcStart, req.body.utcEnd, req.body.description, []);
        return res.json(0);
    }
    else {
        console.log()
        return res.json(1);
    }
});

// userID, scheduleName, index
router.post("/removeException", async function(req, res) {
    await db.removeException(req.body.userID, req.body.scheduleName, req.body.index);
    return res.json(0);
});

// userID, scheduleName, index, utcStart
router.post("/shiftDate", async function(req, res) {
    await db.exceptionShiftDate(req.body.userID, req.body.scheduleName, req.body.index, req.body.utcStart);
    return res.json(0);
});

// userID, scheduleName, index, utcStart
router.post("/changeStartDate", async function(req, res) {
    await db.exceptionChangeStart(req.body.userID, req.body.scheduleName, req.body.index, req.body.utcStart);
    return res.json(0);
});

// userID, scheduleName, index, utcEnd
router.post("/changeEndDate", async function(req, res) {
    await db.exceptionChangeEnd(req.body.userID, req.body.scheduleName, req.body.index, req.body.utcEnd);
    return res.json(0);
});

// userID, scheduleName, index, newDescription
router.post("/changeDescription", async function(req, res) {
    await db.exceptionChangeDescription(req.body.userID, req.body.scheduleName, req.body.index, req.body.newDescription)
    return res.json(0);
});

// userID, scheduleName, index, utcStart, utcEnd, taskName
router.post("/addJob", async function(req, res) {
    let tasks = (await db.readTasksRecord(req.body.userID, req.body.scheduleName)).tasks;
    if (!(req.body.taskName in tasks)) {
        return res.json(1);
    }
    else {
        await db.exceptionAddJob(req.body.userID, req.body.scheduleName, req.body.index, req.body.utcStart, req.body.utcEnd, req.body.taskName);
        return res.json(0);
    }
});

// userID, scheduleName, index, jobIndex
router.post("/removeJob", async function(req, res) {
    await db.exceptionRemoveJob(req.body.userID, req.body.scheduleName, req.body.index, req.body.jobIndex);
    return res.json(0);
});

module.exports = router;