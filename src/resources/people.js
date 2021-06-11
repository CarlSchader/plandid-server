const express = require("express");
const db = require("../database");
const {checkName, statusCodes, checkForClientError} = require("../utilities");

const router = express.Router();

// All routes for this file have a :schedule path parameter and userId is attached to req

router.get("/", async function(req, res) {
    let jsonBody = {message: `Here are the people for the schedule ${req.params.schedule}.`, people: (await db.readPeopleRecord(req.userId, req.params.schedule)).people}; 
    res.status(statusCodes.ok);
    if (jsonBody.people == null) jsonBody.people = {};
    
    res.json(jsonBody);
});

router.get("/:name", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name"});

    let jsonBody = {message: "", person: (await db.readPeopleRecord(req.userId, req.params.schedule)).people[req.params.name]}; 

    if (jsonBody.person === null) {
        res.status(statusCodes.notFound);
        jsonBody.message = `Person by the name of ${req.params.name} not found.`;
    }
    else {
        res.status(statusCodes.ok);
        jsonBody.message = `Here is the info for ${req.params.name}.`;
    }
    
    res.json(jsonBody);
});

router.post("/:name", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name"});

    let jsonBody = {message: ""};

    const name = req.params.name.trim();
    if (checkName(name, (await db.readPeopleRecord(req.userId, req.params.schedule)).people)) {
        await db.addPerson(req.userId, req.params.schedule, name);
        res.status(statusCodes.ok);
        jsonBody.message = `${name} added.`;
    }
    else {
        res.status(statusCodes.badRequest);
        jsonBody.message = "Invalid name.";
    }

    res.json(jsonBody);
})

router.delete("/:name", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name"});

    let jsonBody = {message: `${req.params.name} removed.`};

    await db.removePerson(req.userId, req.params.schedule, req.params.name);

    res.json(jsonBody);
});

router.patch("/:name", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name"}, expectedQueryParams={newName: "new name"});
    
    let jsonBody = {message: ""};

    const newName = req.query.newName.trim();
    if (!checkName(newName, (await db.readPeopleRecord(req.userId, req.params.schedule)).people)) {
        res.status(statusCodes.badRequest);
        jsonBody.message = "New name is invalid.";
    }
    else {
        await db.changePersonName(req.userId, req.params.schedule, req.params.name, newName);
        res.status(statusCodes.ok);
        jsonBody.message = `${req.params.name} changed to ${newName}.`;
    }

    res.json(jsonBody);
});

router.put("/:name/categories", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name"}, expectedBody={}); // The body can be anything. The keys will be the new category names.

    let jsonBody = {message: ""};

    if (!(req.params.name in (await db.readPeopleRecord(req.userId, req.params.schedule)).people)) {
        res.status(statusCodes.notFound);
        jsonBody.message = `${req.params.name} not found.`;
    }
    else {
        await db.changePersonCategories(req.userId, req.params.schedule, req.params.name, req.body.categories);
        res.status(statusCodes.ok);
        jsonBody.message = "Categories set.";
    }

    
    res.json(jsonBody);
});

router.post("/:name/availabilities", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name"}, expectedBody={utcStart: 1, utcEnd: 1, timezone: "luxon timezone"}, optionalBody={rrule: "rrule string or null"});

    let jsonBody = {message: ""};

    if (!(req.params.name in (await db.readPeopleRecord(req.userId, req.params.schedule)).people)) {
        res.status(statusCodes.notFound);
        jsonBody.message = `${req.params.name} not found.`;
    }
    else {
        await db.addPersonAvailability(
            req.userId, 
            req.params.schedule, 
            req.params.name, 
            req.body.utcStart, 
            req.body.utcEnd,
            req.body.timezone,
            req.body.rrule ? req.body.rrule : null
        );
        res.status(statusCodes.ok);
        jsonBody.message = "Availability added.";
    }

    res.json(jsonBody);
});

router.put("/:name/availabilities/:index", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name", index: "index of availability"}, expectedBody={utcStart: 1, utcEnd: 1, timezone: "luxon timezone"}, optionalBody={rrule: "rrule string or null"});

    let jsonBody = {message: ""};

    if (!(req.params.name in (await db.readPeopleRecord(req.userId, req.params.schedule)).people)) {
        res.status(statusCodes.notFound);
        jsonBody.message = `${req.params.name} not found.`;
    }
    else {
        await db.changePersonAvailability(
            req.userId,
            req.params.schedule,
            req.params.name,
            parseInt(req.params.index),
            req.body.utcStart,
            req.body.utcEnd,
            req.body.timezone,
            req.body.rrule ? req.body.rrule : null
        );
        res.status(statusCodes.ok);
        jsonBody.message = `Availability ${index} updated.`;
    }

    res.json(jsonBody);
});

router.delete("/:name/availabilities/:index", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={name: "person's name", index: "index of availability"});

    let jsonBody = {message: ""};

    if (!(req.params.name in (await db.readPeopleRecord(req.userId, req.params.schedule)).people)) {
        res.status(statusCodes.notFound);
        jsonBody.message = `${req.params.name} not found.`;
    }
    else {
        await db.removePersonAvailability(req.userId, req.params.schedule, req.params.name, parseInt(req.params.index));
        res.status(statusCodes.ok);
        jsonBody.message = `Availability ${index} deleted.`;
    }

    res.json(jsonBody);
});

module.exports = router;