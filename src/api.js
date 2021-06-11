const express = require("express");
const {statusCodes, authorize} = require("../utilities");

const router = express.Router();

router.use("/accounts", require("./resources/accounts"));
router.use("/pending-accounts", require("./resources/pendingAccounts"));
router.use("/online-accounts", require("./resources/onlineAccounts"));
router.use('/schedules', require('./resources/schedules'));
// router.use("/stripeRoutes", require("./resources/stripeRoutes"));

// Routes that use :schedule as a path parameter also have userId attached to req.
router.use("/:schedule", async function(req, res, next) {
    req.userId = authorize(req, res);
    if ((await db.readScheduleRecord(userId, req.params.schedule)) === null) {
        res.status(statusCodes.notFound);
        req.json({message: `Couldn't find schedule by the name of ${req.params.schedule}`});
    }
    else {
        next();
    }
});

router.use("/:schedule/people", require("./resources/people"));
router.use("/:schedule/events", require("./resources/events"));
router.use("/:schedule/categories", require("./resources/categories"));
router.use('/:schedule/plans', require('./resources/plans'));

module.exports = router;