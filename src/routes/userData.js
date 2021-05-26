const express = require('express');
const config = require("../config");
const db = require("../database");

const router = express.Router();

// userID
router.post("/getEmail", async function(req, res) {
    res.json((await db.readUserDataRecordFromID(req.body.userID)).email);
});

// tier
router.post("/getTier", async function(req, res) {
    res.json(req.body.tier);
});


// upgradeTier
router.post("/upgradeTier", async function(req, res) {
    // const customer = await stripe.customers.create({
    //     description: ,
    //   });

    const subscription = await stripe.subscriptions.create({
        customer: 'cus_INqj0k1pW9AfC6',
        items: [
          {price: config.stripe.priceKeys[req.body.tier]},
        ],
      });

      
});

module.exports = router;