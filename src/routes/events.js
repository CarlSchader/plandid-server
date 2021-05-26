const express = require('express');
const db = require('../database')
const router = express.Router();

// event
router.post("/addEvent", async function(req, res) {
    const event = req.body.event;
    await db.addEvent(req.body.userID, req.body.scheduleName, event.start, event.end, event.name, event.category, event.rrule);
    res.json(0);
});

// index event
router.post("/updateEvent", async function(req, res) {
    const event = req.body.event;
    await db.updateEvent(req.body.userID, req.body.scheduleName, req.body.index, event.start, event.end, event.name, event.category, event.rrule);
    res.json(0);
});

// index
router.post("/deleteEvent", async function(req, res) {
    await db.deleteEvent(req.body.userID, req.body.scheduleName, req.body.index);
    res.json(0);
});

// 
router.post("/getEvents", async function(req, res) {
    res.json((await db.readEventsRecord(req.body.userID, req.body.scheduleName)).events);
});

module.exports = router;