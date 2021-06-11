const express = require("express");
const db = require("../database");
const {statusCodes, checkForClientError} = require("../utilities");

const router = express.Router();

// All routes for this file have a :schedule path parameter and userId is attached to req

router.get("/", async function(req, res) {
    res.json({message: `Here are the events for ${schedule}`, events: (await db.readEventsRecord(req.userId, req.params.schedule)).events});
});

router.post("/", async function(req, res) {
    checkForClientError(req, res, expectedBody={start: 1, end: 1, name: "event name"}, optionalBody={category: "name of category", rrule: "rrule string"});

    await db.addEvent(
        req.userId, 
        req.params.schedule, 
        req.body.start, 
        req.body.end, 
        req.body.name, 
        req.body.category ? req.body.category : null, 
        req.body.rrule ? req.body.rrule : null
    );
    
    res.status(statusCodes.ok);
    res.json({message: "Event added."});
});

router.put("/:index", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={index: "index of event"}, expectedBody={start: 1, end: 1, name: "event name"}, optionalBody={category: "name of category", rrule: "rrule string"});

    await db.updateEvent(
        req.userId, 
        req.params.schedule, 
        parseInt(req.params.index), 
        req.body.start, 
        req.body.end, 
        req.body.name, 
        req.body.category ? req.body.category : null, 
        req.body.rrule ? req.body.rrule : null
    );

    res.status(statusCodes.ok);
    res.json({message: `Event ${req.params.index} updated`});
});

router.delete("/:index", async function(req, res) {
    await db.deleteEvent(req.userId, req.params.schedule, parseInt(req.params.index));
    
    res.status(statusCodes.ok);
    res.json({message: `Event ${req.params.index} deleted`});
});

module.exports = router;