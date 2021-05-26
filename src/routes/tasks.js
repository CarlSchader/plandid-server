const express = require('express');
const db = require('../database');
const { categoryIsOkay, checkName } = require('../utilities');

const router = express.Router();

// userID, scheduleName
router.post("/getTasks", async function(req, res) {
    res.json((await db.readTasksRecord(req.body.userID, req.body.scheduleName)).tasks);
});

// userID, scheduleName, name, category
router.post("/addTask", async function(req, res) {
    let name = req.body.name.trim();
    if (!checkName(name, (await db.readTasksRecord(req.body.userID, req.body.scheduleName)).tasks)) {
        return res.json(1);
    }
    else if (!categoryIsOkay(req.body.category)) {
        return res.json(2);
    }
    else {
        await db.addTask(req.body.userID, req.body.scheduleName, name, req.body.category);
        return res.json(0);
    }
});

// userID, scheduleName, name
router.post("/removeTask", async function(req, res) {
    await db.removeTask(req.body.userID, req.body.scheduleName, req.body.name);
    return res.json(0);
});

// userID, scheduleName, oldName, newName
router.post("/changeName", async function(req, res) {
    let newName = req.body.newName.trim();
    if (!checkName(newName, (await db.readTasksRecord(req.body.userID, req.body.scheduleName)).tasks)) {
        return res.json(1);
    }
    else {
        await db.changeTaskName(req.body.userID, req.body.scheduleName, req.body.oldName, newName);
        return res.json(0);
    }
});

// userID, scheduleName, name, category
router.post("/changeCategory", async function(req, res) {
    let newCategory = req.body.category;
    if (!categoryIsOkay(newCategory)) {
        return res.json(1);
    }
    else {
        await db.changeTaskCategory(req.body.userID, req.body.scheduleName, req.body.name, newCategory);
        return res.json(0);
    }
});

module.exports = router;