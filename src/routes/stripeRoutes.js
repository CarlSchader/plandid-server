const express = require('express');
const config = require("../config");
const db = require("../database");

const router = express.Router();

const stripe = require('stripe')(config.stripe.privateKey);

// upgradeTier
router.post("/create-checkout-session", async (req, res) => {
    if (req.body.tier === req.body.upgradeTier) {
        return res.redirect("/Success");
    }

    const priceId = config.stripe.priceKeys[req.body.upgradeTier];
    // See https://stripe.com/docs/api/checkout/sessions/create
    // for additional parameters to pass.
    try {
        let options = {
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],
            // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
            // the actual Session ID is returned in the query parameter when your customer
            // is redirected to the success page.
            success_url: config.url + '/Success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: config.url + '/Subscription',
            metadata: {tier: req.body.upgradeTier}
        }
        let customerId = await db.readStripeCustomerID(req.body.userID);
        if (customerId) {
            options["customer"] = customerId;
        }
        else {
            options["customer_email"] = (await db.readUserDataRecordFromID(req.body.userID)).email;
        }
        const session = await stripe.checkout.sessions.create(options);
  
        res.json({
            sessionId: session.id,
        });
    } catch (e) {
        console.error(e)
        res.status(400);
        return res.send({
            error: {
            message: e.message,
        }
      });
    }
});

// userID sessionId
router.post("/checkout-session", async (req, res) => {
    try {
        const sessionId = req.body.sessionId;
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        await db.createStripeCustomerRecord(req.body.userID, session.customer);
        return res.json(true);
    }
    catch (e) {
        console.error(e)
        return res.json(false);
    }
});

// userID
router.post('/customer-portal', async (req, res) => {
    // This is the url to which the customer will be redirected when they are done
    // managign their billing with the portal.
    const returnUrl = config.url + "/Calendar";
  
    const portalsession = await stripe.billingPortal.sessions.create({
      customer: await db.readStripeCustomerID(req.body.userID),
      return_url: returnUrl,
    });

    res.send({
      url: portalsession.url,
    });
});

module.exports = router;