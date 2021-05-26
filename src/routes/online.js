const express = require('express');
const db = require('../database');

const router = express.Router();

// session.sessionID
router.post("/logout", async function(req, res) {
    if (req.session && req.session.sessionID) {
        await db.removeOnlineRecord(req.session.sessionID);
        req.session.destroy();
        return res.json(0);
    }
    else {
        return res.json(1);
    }
});

module.exports = router;