const express = require("express");
const db = require("../database");
const {statusCodes, checkForClientError} = require("../utilities");

const router = express.Router();

router.post("/", async function(req, res) {
    res.status(statusCodes.ok);
    res.json({
        message: `Here are the categories for ${req.params.schedule}`,
        categories: (await db.readCategoriesRecord(req.userId, req.params.schedule)).categories
    });
});

router.post("/:category", async function(req, res) {
    checkForClientError(req, res, expectedPathParams={category: "category name"});

    const newCategory = req.params.category.trim().toLowerCase();
    await db.addCategory(req.userId, req.params.schedule, newCategory);
    
    res.status(statusCodes.ok);
    res.json({message: `New category ${newCategory} added.`});
});

module.exports = router;