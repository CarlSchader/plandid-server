const express = require('express');
const nodemailer = require('nodemailer');
const fs = require("fs");
const db = require('../database');
const {statusCodes, checkForClientError} = require("../utilities");

const config = JSON.parse(fs.readFileSync("./config.json"));
const emailConfig = config.emailConfig;
const appName = config.appName;
const url = config.url;
const freeTierName = config.freeTierName;

const router = express.Router();

function sendEmail(to, subject, html, from = emailConfig.address, password = emailConfig.password, service = emailConfig.service) {
    let transporter = nodemailer.createTransport({
        service: service,
        auth: {
          user: from,
          pass: password
        }
      });
      
      let mailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: html
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        }
      });
}

function emailString(key) {
    return `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Trek</title>
      </head>
      <body>
          <meta charset="utf-8"/>
          <p>
          Click this button to confirm account creation.
        </p>
        <form action="${url}/api/accounts" method="post">
            <input type="hidden" name="key" value="${key}" />
            <input type="submit" value="Confirm">
        </form>
      </body>
    </html>
    `;
}

// signUp
router.put("/pending-accounts", async function(req, res) {
    checkForClientError(req, res, expectedBody={email: "example@gmail.com", password: "example-password"});

    let jsonBody = {message: ""};

    if (!await db.accountExists(req.body.email)) { // Email not in database.
        let validationRecord = await db.readEmailValidationRecordFromEmail(req.body.email);
        if (validationRecord !== null) { // Email validation already sent
            await db.removeEmailValidationRecord(validationRecord.key);
        }
        let key = await db.createEmailValidationRecord(req.body.email, req.body.password);
        sendEmail(req.body.email, `Welcome to ${appName}`, emailString(key));
        res.status(statusCodes.success);
        jsonBody.message = "New email validation sent.";
    }
    else { // Email is already in database.
        res.status(statusCodes.success);
        jsonBody.message = "Email is already being used.";
    }

    res.json(jsonBody);
});

// login
router.put("/online-accounts", async function(req, res) {
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

// isLoggedIn
router.get("/online-status", async function(req, res) {
    let jsonBody = {message: "Not logged in.", online: false};
    
    if (req.session && req.session.sessionID) {
        if (await db.isLoggedIn(req.session.sessionID)) {
            jsonBody.message = "Logged in.";
            jsonBody.online = true;
        }
    }
    
    res.status(statusCodes.success);
    res.json(jsonBody);
});

// confirmAccount
router.post("/accounts", async function(req, res) {
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
            let userID = await db.createAccount(validationData.email, validationData.password, freeTierName);
            let sessionID = await db.createOnlineRecord(userID);
            req.session.sessionID = sessionID;
            req.session.save();
            res.redirect(config.url);
        }
    }
    else {
        res.status(statusCodes.clientError);
        jsonBody.message = "Email validation timed out.";
    }
    
    res.json(jsonBody);
});

module.exports = router;