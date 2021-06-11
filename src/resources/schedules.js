const express = require("express");
const db = require("../database");
const {statusCodes, authorize, checkForClientError} = require("../utilities");

const router = express.Router();

router.get("/:name", async function(req, res) {
    const userId = authorize(req, res);
    checkForClientError(req, res, expectedPathParams={name: "schedule name"});

    let jsonBody = {message: "", schedule: (await db.readScheduleRecord(userId, req.params.name))};

    if (jsonBody.schedule === null) {
        res.status(statusCodes.notFound);
        jsonBody.message = `Couldn't find schedule by the name of ${req.params.name}`;
    }
    else {
        res.status(statusCodes.accepted);
        jsonBody.message = "Schedule found.";
    }
    res.json(jsonBody);
});

router.patch("/:name", async function(req, res) {
    const userId = authorize(req, res);
    checkForClientError(req, res, expectedPathParams={name: "schedule name"}, expectedQueryParams={newName: "new schedule name"});

    let jsonBody = {message: ""};

    const newName = req.query.newName.trim();
    const scheduleRecord = await db.readScheduleRecord(userId, newName);

    if (newName.length < 1) {
        res.status(statusCodes.badRequest);
        jsonBody.message = "New name is too short.";
    }
    else if (scheduleRecord !== null) {
        res.status(statusCodes.conflict);
        jsonBody.message = `Schedule by the name of ${req.params.name} already exists.`;
    }
    else {
        await db.changeScheduleName(userId, req.params.name, newName);
        await db.changeUserDataLastUsedSchedule(userId, newName);

        res.status(statusCodes.accepted);
        jsonBody.message = `Schedule name ${req.params.name} changed to ${newName}.`;
    }

    res.json(jsonBody);
});

module.exports = router;