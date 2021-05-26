const express = require('express');
const { DateTime } = require('luxon');
const db = require('../database')
const { planDays, binaryIndexSearch } = require('../algorithm');
const { lookBackMillis, tiers } = require('../config');
const { localDate } = require('../utilities');
const router = express.Router();

// Cuts old plans before storageMillis, returns oldPlans after lookBackMillis
function managePlans(plans, utcStart, lookBackMillis, storageMillis) {
    // startIndex is the first index greater but not included in oldPlans
    let {0: startIndex} = binaryIndexSearch({start: utcStart}, plans, (x, y) => x.start < y.start);
    if (startIndex == -1) {
        return [[], []];
    }
    else {
        while (startIndex >= 0 && utcStart <= plans[startIndex].start) {
            startIndex--;
        } 
        startIndex++;
    }
    
    // first index included in oldPlans
    let {0: lookBackIndex} = binaryIndexSearch({start: utcStart - lookBackMillis}, plans, (x, y) => x.start < y.start);
    while (lookBackIndex >= 0 && utcStart - lookBackMillis <= plans[lookBackIndex].start) {
        lookBackIndex--;
    }
    lookBackIndex++;

    let {0: storageIndex} = binaryIndexSearch({start: utcStart - storageMillis}, plans, (x, y) => x.start < y.start);
    while (storageIndex >= 0 && utcStart - storageMillis <= plans[storageIndex].start) {
        storageIndex--;
    }
    storageIndex++;

    let cutPlans = plans.slice(Math.max(0, storageIndex), startIndex);
    let oldPlans = plans.slice(Math.max(0, lookBackIndex), startIndex);
    return [oldPlans, cutPlans];
}

// userID, scheduleName, tier, utcStart, utcEnd
router.post("/makePlans", async function(req, res) {
    console.log(localDate(req.body.utcStart).toLocaleString(), localDate(req.body.utcEnd).toLocaleString())
    let utcStart = Math.max(req.body.utcStart, DateTime.utc());
    if (utcStart < req.body.utcEnd) {
        let plans = (await db.readPlansRecord(req.body.userID, req.body.scheduleName)).plans;
        let [oldPlans, cutPlans] = managePlans(plans, utcStart, lookBackMillis, tiers[req.body.tier].storageMillis);
        let people = (await db.readPeopleRecord(req.body.userID, req.body.scheduleName)).people;
        let week = (await db.readWeekRecord(req.body.userID, req.body.scheduleName)).week;
        let exceptions = (await db.readExceptionsRecord(req.body.userID, req.body.scheduleName)).exceptions;
        let newPlans = planDays(people, week, exceptions, oldPlans, utcStart, Math.min(req.body.utcEnd, DateTime.utc().toMillis() + tiers[req.body.tier].forwardMillis));
        cutPlans = cutPlans.concat(newPlans);
        console.log(cutPlans)
        await db.updatePlans(req.body.userID, req.body.scheduleName, cutPlans);
        res.json(0);
    }
    else {
        res.json(1);
    }
});

// userID, scheduleName
router.post("/getPlans", async function(req, res) {
    res.json((await db.readPlansRecord(req.body.userID, req.body.scheduleName)).plans);
});

module.exports = router;