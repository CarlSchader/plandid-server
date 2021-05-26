const express = require('express');
const db = require('../database');
const { checkCategories, checkName } = require('../utilities');

const router = express.Router();

// userID, scheduleName
router.post("/getPeople", async function(req, res) {
    res.json((await db.readPeopleRecord(req.body.userID, req.body.scheduleName)).people);
});

// userID, scheduleName name
router.post("/getPerson", async function(req, res) {
    res.json((await db.readPeopleRecord(req.body.userID, req.body.scheduleName)).people[req.body.name]);
});

// userID, scheduleName, name
router.post("/addPerson", async function(req, res) {
    let name = req.body.name.trim();
    if (checkName(name, (await db.readPeopleRecord(req.body.userID, req.body.scheduleName)).people)) {
        await db.addPerson(req.body.userID, req.body.scheduleName, name);
        return res.json(0);
    }
    else {
        return res.json(1);
    }
})

// userID, scheduleName, name
router.post("/removePerson", async function(req, res) {
    await db.removePerson(req.body.userID, req.body.scheduleName, req.body.name);
    return res.json(0);
});

// userID, scheduleName, oldName, newName
router.post("/changeName", async function(req, res) {
    let newName = req.body.newName.trim();
    if (!checkName(newName, (await db.readPeopleRecord(req.body.userID, req.body.scheduleName)).people)) {
        return res.json(1);
    }
    else {
        await db.changePersonName(req.body.userID, req.body.scheduleName, req.body.oldName, newName);
        return res.json(0);
    }
});

// userID, scheduleName, name, categories
router.post("/setCategories", async function(req, res) {
    await db.changePersonCategories(req.body.userID, req.body.scheduleName, req.body.name, req.body.categories);
    return res.json(0);
});

// userID, scheduleName, name, utcStart, utcEnd, timezone, rrule
router.post("/addAvailability", async function(req, res) {
    await db.addPersonAvailability(
        req.body.userID, 
        req.body.scheduleName, 
        req.body.name, 
        req.body.utcStart, 
        req.body.utcEnd,
        req.body.timezone,
        req.body.rrule
        );
    return res.json(0);
});

// userID, scheduleName, name, index, utcStart, utcEnd, timezone, rrule
router.post("/changeAvailability", async function(req, res) {
    await db.changePersonAvailability(
        req.body.userID,
        req.body.scheduleName,
        req.body.name,
        req.body.index,
        req.body.utcStart,
        req.body.utcEnd,
        req.body.timezone,
        req.body.rrule
    );
    return res.json(0);
});

// userID, scheduleName, name, index
router.post("/removeAvailability", async function(req, res) {
    await db.removePersonAvailability(req.body.userID, req.body.scheduleName, req.body.name, req.body.index);
    return res.json(0);
});

module.exports = router;