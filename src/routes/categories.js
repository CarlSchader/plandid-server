const express = require('express');
const db = require('../database')
const router = express.Router();

// userID scheduleName
router.post("/getCategories", async function(req, res) {
    return res.json((await db.readCategoriesRecord(req.body.userID, req.body.scheduleName)).categories);
});

// userID scheduleName category
router.post("/addCategory", async function(req, res) {
    await db.addCategory(req.body.userID, req.body.scheduleName, req.body.category.trim().toLowerCase());
    return res.json(0);
});

module.exports = router;