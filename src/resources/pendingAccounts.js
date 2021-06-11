const db = require("../database");
const express = require("express");
const {statusCodes, checkForClientError} = require("../utilities");
const nodemailer = require("nodemailer");

const {emailConfig, appName, url} = JSON.parse(require("fs").readFileSync("./config.json"));

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
router.put("/", async function(req, res) {
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

module.exports = router;