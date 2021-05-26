const express = require('express');
const bodyParser = require("body-parser");
const {invert} = require("../utilities");
const config = require("../config");
const db = require("../database");
const router = express.Router();

const stripe = require('stripe')(config.stripe.privateKey);
const webhookSecret = config.stripe.webhookSecret;

const tiersFromPrices = invert(config.stripe.priceKeys);

router.use(bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf
    }
}));

async function handleStripeSubscriptionUpdated(subscription) {
    const customerId = subscription.customer;
    const priceId = subscription.items.data[0].price.id;
    const userID = await db.readUserIDfromCustomerId(customerId);
    const tier = tiersFromPrices[priceId];

    switch (subscription.status) {
        case "active":
            await db.changeUserDataTier(userID, tier);
            break;
        case "past_due":
            await db.changeUserDataTier(userID, tier);
            break;
        case "incomplete":
            await db.changeUserDataTier(userID, tier);
            break;
        case "trialing":
            await db.changeUserDataTier(userID, tier);
            break;
        case "incomplete_expired":
            await db.changeUserDataTier(userID, config.freeTierName);
            break;
        case "unpaid":
            await db.changeUserDataTier(userID, config.freeTierName);
            break;
        case "canceled":
            await db.changeUserDataTier(userID, config.freeTierName);
            break;
        default:
            console.log("Error in stripe webhook: subscription updated event: switch case default case triggered");
            break;
    }
}

router.post("/stripeWebhook", async (request, response) => {
    const signature = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.rawBody, signature, webhookSecret);
    }
    catch (err) {
        console.error(err.message)
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    switch (event.type) {
        case "customer.subscription.updated":
            await handleStripeSubscriptionUpdated(event.data.object);
            break;
        case "customer.subscription.deleted":
            const customerId = event.data.object.customer;
            const userID = await db.readUserIDfromCustomerId(customerId);
            await db.changeUserDataTier(userID, config.freeTierName);
            break;
        default:
            console.log("unhandled stripe event:", event.type);
            break;
      }
  
    return response.sendStatus(200);
});

  module.exports = router;