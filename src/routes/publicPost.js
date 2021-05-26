const express = require('express');
const nodemailer = require('nodemailer');
const {emailConfig, appName, url, freeTierName} = require('../config');
const db = require('../database');

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
        <form action="${url}/publicPost/confirmAccount" method="get">
            <input type="hidden" name="key" value="${key}" />
            <input type="submit" value="Confirm">
        </form>
      </body>
    </html>
    `;
}

// email, password
router.post("/signUp", async function(req, res) {
    if (!await db.accountExists(req.body.email)) { // Email not in database.
        let validationRecord = await db.readEmailValidationRecordFromEmail(req.body.email);
        if (validationRecord !== null) { // Email validation already sent
            await db.removeEmailValidationRecord(validationRecord.key);
        }
        let key = await db.createEmailValidationRecord(req.body.email, req.body.password);
        sendEmail(req.body.email, `Welcome to ${appName}`, emailString(key));
        return res.json(0);
    }
    else { // 1: Email is already in database.
        return res.json(1);
    }
});

// email, password
router.post("/login", async function(req, res) {
    let userData = await db.readUserDataRecord(req.body.email, req.body.password);
    if (userData !== null) {
        req.session.sessionID = await db.createOnlineRecord(userData.userID);
        req.session.save();
        return res.json(0);
    }
    else {
        return res.json(1)
    }
});

// session.sessionID
router.post("/isLoggedIn", async function(req, res) {
    if (req.session && req.session.sessionID) {
        if (await db.isLoggedIn(req.session.sessionID)) {
            res.json(true);
            return;
        }
    }
    return res.json(false);
});

// query.key
router.get("/confirmAccount", async function(req, res) {
    let validationData = await db.readEmailValidationRecord(req.query.key);
    if (validationData !== null) {
        await db.removeEmailValidationRecord(req.query.key);
        let userID = await db.createAccount(validationData.email, validationData.password, freeTierName);
        let sessionID = await db.createOnlineRecord(userID);
        req.session.sessionID = sessionID;
        req.session.save();
        console.log(`Created new user: ${validationData.email}`);
        return res.redirect("/Calendar")
    }
    else {
        return res.json(1);
    }
});

module.exports = router;