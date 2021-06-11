const express = require("express");
const {db} = require("../database");
const {statusCodes, checkForClientError, authorize} = require("../utilities");

const {freeTierName, url} = JSON.parse(require("fs").readFileSync("./config.json"));

const router = express.Router();

router.post("/", async function(req, res) {
    checkForClientError(req, res, expectedQueryParams={key: "random string"});

    let jsonBody = {message: ""};

    let validationData = await db.readEmailValidationRecord(req.query.key);
    if (validationData !== null) {
        if (await db.accountExists(validationData.email)) {
            res.status(statusCodes.clientError);
            jsonBody.message = "Account already exists.";
        }
        else {
            await db.removeEmailValidationRecord(req.query.key);
            const userId = await db.createAccount(validationData.email, validationData.password, freeTierName);
            req.session.sessionID = await db.createOnlineRecord(userId);
            req.session.save();
            res.redirect(url);
        }
    }
    else {
        res.status(statusCodes.clientError);
        jsonBody.message = "Email validation timed out.";
    }
    
    res.json(jsonBody);
});

router.get("/email", async function(req, res) {
    const userId = authorize(req, res);
    
    res.status(statusCodes.ok);
    res.json({message: "Here is your email.", email: (await db.readUserDataRecordFromID(userId)).email});
});

router.get("/tier", async function(req, res) {
    const userId = authorize(req, res);

    res.status(statusCodes.ok);
    res.json({message: "Here is your tier.", tier: (await db.readUserDataRecordFromID(userId)).tier});
});

module.exports = router;