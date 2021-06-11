const db = require("../database");
const express = require("express");
const {statusCodes, checkForClientError} = require("../utilities");

const router = express.Router();

// login
router.put("/", async function(req, res) {
    checkForClientError(req, res, expectedBody={email: "example@gmail.com", password: "example-password"});

    let jsonBody = {message: ""};

    let userData = await db.readUserDataRecord(req.body.email, req.body.password);
    if (userData !== null) {
        req.session.sessionID = await db.createOnlineRecord(userData.userID);
        res.status(statusCodes.success);
        jsonBody.message = "Login successful.";
    }
    else {
        res.status(statusCodes.success);
        jsonBody.message = "Login unsuccessful.";
    }

    res.json(jsonBody);
});

router.delete("/", async function(req, res) {
    let jsonBody = {message: ""};
    
    if (req.session && req.session.sessionID) {
        await db.removeOnlineRecord(req.session.sessionID);
        req.session.destroy();
        jsonBody.message = "Successful logout.";
        res.status(statusCodes.ok);
    }
    else {
        jsonBody.message = "Invalid session id.";
        res.status(statusCodes.unauthorized);
    }
    
    res.json(jsonBody);
});

// // isLoggedIn
// router.get("/my-account", async function(req, res) {
//     let jsonBody = {message: "Not logged in.", online: false};
    
//     if (req.session && req.session.sessionID) {
//         if (await db.isLoggedIn(req.session.sessionID)) {
//             jsonBody.message = "Logged in.";
//             jsonBody.online = true;
//         }
//     }
    
//     res.status(statusCodes.success);
//     res.json(jsonBody);
// });

module.exports = router;