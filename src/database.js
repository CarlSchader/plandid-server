const { MongoClient } = require('mongodb');
const fs = require("fs");
const { rangeMerge, overlapSearch } = require('./algorithm');
const { makeID, sortRangedObjectArray } = require('./utilities');

const config = JSON.parse(fs.readFileSync("./config.json"));
const mongodbConfig = config.mongodbConfig;
const names = mongodbConfig.collectionNames;

const client = new MongoClient(mongodbConfig.uri, {useNewUrlParser: true, useUnifiedTopology: true});

// Connects to client. (Runs in index.js)
async function connect() {
	try {
		await client.connect();
		return true;
	}
	catch(error) {
		console.error(error);
		return false;
	}
}


// Database schemas
function emailValidationSchema(key, email, password) {
	return {createdAt: new Date(), key: key, email: email, password: password};
}

function userDataSchema(userID, email, password, tier) {
    return {userID: userID, email: email, password: password, tier: tier, lastUsedSchedule: ""};
}

function scheduleSchema(userID, scheduleName) {
    return {userID: userID, scheduleName: scheduleName};
}

function peopleSchema(userID, scheduleName) {
    return {userID: userID, scheduleName: scheduleName, people: {}};
}

function categoriesSchema(userID, scheduleName) {
    return {userID: userID, scheduleName: scheduleName, categories: {}}
}

function eventsSchema(userID, scheduleName) {
    return {userID: userID, scheduleName: scheduleName, events: []}
}

function plansSchema(userID, scheduleName) {
    return {userID: userID, scheduleName: scheduleName, plans: []};
}

function onlineSchema(sessionID, userID, email) {
    return {createdAt: new Date(), sessionID: sessionID, userID: userID, email: email};
}



// Database subfield schemas
function people_personSchema(categories) {
	return {categories: categories, availabilities: []}
}

function people_availabilitySchema(startTime, endTime, timezone, rrule) {
	return {start: startTime, end: endTime, timezone: timezone, rrule: rrule};
}

function events_eventSchema(start, end, name, category, rrule) {
    return {start: start, end: end, name: name, category: category, rrule: rrule}
}

function plans_planSchema(start, end, personName, eventName, category) {
	return {start: start, end: end, personName: personName, eventName: eventName, category: category};
}



// Base level database functions
async function create(collection, data) {
	return await (await client.db(mongodbConfig.databaseName).collection(collection).insertOne(data));
}

async function createMany(collection, dataArray) {
	return await client.db(mongodbConfig.databaseName).collection(collection).insertMany(dataArray);
}

async function read(collection, data) {
	return await client.db(mongodbConfig.databaseName).collection(collection).findOne(data);
}

async function readMany(collection, data, limit=0) {
	const cursor = await client.db(mongodbConfig.databaseName).collection(collection).find(data)
	if (limit > 0) cursor.limit(limit);
	return await cursor.toArray();
}

async function update(collection, filter, updateQuery) {
	return await client.db(mongodbConfig.databaseName).collection(collection).updateOne(filter, updateQuery);
}

async function remove(collection, objectToDelete) {
	return await client.db(mongodbConfig.databaseName).collection(collection).deleteOne(objectToDelete);
}

async function removeMany(collection, objectToDelete) {
	return await client.db(mongodbConfig.databaseName).collection(collection).deleteMany(objectToDelete);
}

async function sortArray(collection, arrayPath, sortFieldPath, ascending=true) {
	let ascendingDigit = 1;
	if (!ascending) {
		ascendingDigit = -1;
	}
	let arrayName = arrayPath.split('.').pop();
	let sortQuery = {$sort: {}};
	sortQuery["$sort"][sortFieldPath] = ascendingDigit; 
	let groupQuery = {$group: {_id: "$_id"}};
	groupQuery["$group"][arrayName] = {$push: `$${arrayPath}`};
	let projectQuery = {$project: {}};
	projectQuery["$project"][arrayPath] = `$${arrayName}`;

	return await client.db(mongodbConfig.databaseName).collection(collection).aggregate(
		{$unwind: `$${arrayPath}`},
		sortQuery,
		groupQuery,
		projectQuery
	).pretty();
}

async function recordExists(collection, searchObject) {
    let record = await read(collection, searchObject);
    if (record === null) {
        return false;
    }
    else {
        return true;
    }
}

async function generateUniqueKey(collection, keyName) {
    let query = {};
    query[keyName] = makeID(mongodbConfig.idLength);
    while (await recordExists(collection, query)) {
        query[keyName] = makeID(mongodbConfig.idLength);
    }
    return query[keyName];
}


// Data creation functions
async function createEmailValidationRecord(email, password) {
    let key = await generateUniqueKey(names.emailValidation, "key");
    await create(names.emailValidation, emailValidationSchema(key, email, password));
    return key;
}

async function createUserDataRecord(email, password, tier) {
    let userID = await generateUniqueKey(names.userData, "userID");
    await create(names.userData, userDataSchema(userID, email, password, tier));
    return userID;
}

async function createScheduleRecord(userID, scheduleName) {
	return await create(names.schedule, scheduleSchema(userID, scheduleName));
}

async function createPeopleRecord(userID, scheduleName) {
	return await create(names.people, peopleSchema(userID, scheduleName));
}

async function createPlansRecord(userID, scheduleName) {
	return await create(names.plans, plansSchema(userID, scheduleName));
}

async function createEventsRecord(userID, scheduleName) {
    return await create(names.events, eventsSchema(userID, scheduleName));
}

async function createCategoriesRecord(userID, scheduleName) {
    return await create(names.categories, categoriesSchema(userID, scheduleName));
}

async function createAccount(email, password, tier) {
	let userID = await createUserDataRecord(email, password, tier);
	let scheduleName = "New Schedule";
	await createScheduleRecord(userID, scheduleName);
	await createPeopleRecord(userID, scheduleName);
    await createEventsRecord(userID, scheduleName);
    await createCategoriesRecord(userID, scheduleName);
	await createPlansRecord(userID, scheduleName);
	return userID;
}

async function createOnlineRecord(userID) {
	let userData = await readUserDataRecordFromID(userID);
	if (userData !== null) {
        let sessionID = await getSessionID(userData.email);
        if (sessionID === null) {
            sessionID = await generateUniqueKey(names.online, "sessionID");
            await create(names.online, onlineSchema(sessionID, userID, userData.email));
            return sessionID;
        }
        else {
            return sessionID;
        }
	}
	else {
		return null;
	}
}



// Remove data functions
async function removeEmailValidationRecord(key) {
	await remove(names.emailValidation, {key: key});
}

async function removeUserDataRecord(userID) {
	await remove(names.userData, {userID: userID});
}

async function removeScheduleRecord(userID, scheduleName) {
	await remove(names.schedule, {userID: userID, scheduleName: scheduleName});
}

async function removePeopleRecord(userID, scheduleName) {
	await remove(names.people, {userID: userID, scheduleName: scheduleName});
}

async function removePlansRecord(userID, scheduleName) {
	await remove(names.plans, {userID: userID, scheduleName: scheduleName});
}

async function removeOnlineRecord(sessionID) {
	await remove(names.online, {sessionID: sessionID});
}

async function clearDatabase() {
    for (const key in names) {
        await removeMany(names[key], {});
    }
}



// Read data functions
async function readEmailValidationRecord(key) {
	return await read(names.emailValidation, {key: key});
}

async function readEmailValidationRecordFromEmail(email) {
	return await read(names.emailValidation, {email: email});
}

async function readUserDataRecordFromID(userID) {
	return await read(names.userData, {userID: userID});
}

async function readUserDataRecord(email, password) {
	return await read(names.userData, {email: email, password: password});
}

async function readScheduleRecord(userID, scheduleName) {
	return await read(names.schedule, {userID: userID, scheduleName: scheduleName});
}

async function readPeopleRecord(userID, scheduleName) {
	return await read(names.people, {userID: userID, scheduleName: scheduleName});
}

async function readEventsRecord(userID, scheduleName) {
    return await read(names.events, {userID: userID, scheduleName: scheduleName});
}

async function readCategoriesRecord(userID, scheduleName) {
    return await read(names.categories, {userID: userID, scheduleName: scheduleName});
}

async function readPlansRecord(userID, scheduleName) {
	return await read(names.plans, {userID: userID, scheduleName: scheduleName});
}

async function readOnlineRecord(sessionID) {
	return await read(names.online, {sessionID: sessionID});
}

async function getSessionID(email) {
    let onlineData = await read(names.online, {email: email});
    if (onlineData === null) {
        return null;
    }
    else {
        return onlineData.sessionID;
    }
}

async function readRandomScheduleRecord(userID) {
    return await read(names.schedule, {userID: userID});
}



// Update data functions
async function isLoggedIn(sessionID) {
    let onlineData = await read(names.online, {sessionID: sessionID});
    if (onlineData !== null) {
        return true;
    }
    else {
        return false;
    }
}

async function isLoggedInEmail(email) {
    let onlineData = await read(names.online, {email: email});
    if (onlineData !== null) {
        return true;
    }
    else {
        return false;
    }
}

async function userIDfromSessionID(sessionID) {
    const record = await read(names.online, {sessionID: sessionID});
    return record ? record.userID : null;
}

async function changeUserDataEmail(userID, newEmail) {
	await update(names.userData, {userID: userID}, {$set: {email: newEmail}});
}

async function changeUserDataPassword(userID, newPassword) {
	await update(names.userData, {userID: userID}, {$set: {password: newPassword}});
}

async function changeUserDataTier(userID, tier) {
	await update(names.userData, {userID: userID}, {$set: {tier: tier}});
}

async function changeUserDataLastUsedSchedule(userID, lastUsedSchedule) {
    await update(names.userData, {userID: userID}, {$set: {lastUsedSchedule: lastUsedSchedule}});
}

async function changeUserDataStripeCustomerId(userID, stripeCustomerId) {
    await update(names.userData, {userID: userID}, {$set: {stripeCustomerId: stripeCustomerId}});
}

async function changeScheduleName(userID, oldScheduleName, newScheduleName) {
	await update(names.schedule, {userID: userID, scheduleName: oldScheduleName}, {$set: {scheduleName: newScheduleName}});
	await update(names.people, {userID: userID, scheduleName: oldScheduleName}, {$set: {scheduleName: newScheduleName}});
    await update(names.events, {userID: userID, scheduleName: oldScheduleName}, {$set: {scheduleName: newScheduleName}});
    await update(names.categories, {userID: userID, scheduleName: oldScheduleName}, {$set: {scheduleName: newScheduleName}});
	await update(names.plans, {userID: userID, scheduleName: oldScheduleName}, {$set: {scheduleName: newScheduleName}});
}

async function addPerson(userID, scheduleName, name, categories={}) {
	let query = {$set: {}};
    query["$set"][`people.${name}`] = people_personSchema(categories);
	await update(names.people, {userID: userID, scheduleName: scheduleName}, query);
}

async function removePerson(userID, scheduleName, name) {
	let query = {$unset: {}};
	query["$unset"][`people.${name}`] = "";
	await update(names.people, {userID: userID, scheduleName: scheduleName}, query);
}

async function changePersonName(userID, scheduleName, oldName, newName) {
	let person = (await readPeopleRecord(userID, scheduleName)).people[oldName];
	await removePerson(userID, scheduleName, oldName);
	await addPerson(userID, scheduleName, newName, categories=person.categories);
}

async function changePersonCategories(userID, scheduleName, name, newCategories) {
	let query = {$set: {}};
	query["$set"][`people.${name}.categories`] = newCategories;
	await update(names.people, {userID: userID, scheduleName: scheduleName}, query);
}

async function addPersonAvailability(userID, scheduleName, name, utcStart, utcEnd, timezone, rrule) {
    const newAvailability = people_availabilitySchema(utcStart, utcEnd, timezone, rrule);
    let query = {$push: {}};
    query["$push"][`people.${name}.availabilities`] = {$each: [newAvailability], $sort: {start: 1}};
    await update(names.people, {userID: userID, scheduleName: scheduleName}, query);
}

async function changePersonAvailability(userID, scheduleName, name, index, utcStart, utcEnd, timezone, rrule) {
    const newAvailability = people_availabilitySchema(utcStart, utcEnd, timezone, rrule);
    let query = {$set: {}};
    query["$set"][`people.${name}.availabilities.${index}`] = newAvailability;
    await update(names.people, {userID: userID, scheduleName: scheduleName}, query);
    query = {$push: {}};
    query["$push"][`people.${name}.availabilities`] = {$each: [], $sort: {start: 1}};
    await update(names.people, {userID: userID, scheduleName: scheduleName}, query);
}

async function removePersonAvailability(userID, scheduleName, name, index) {
	let availabilities = (await readPeopleRecord(userID, scheduleName)).people[name].availabilities;
	availabilities.splice(index, 1);
	let query = {$set: {}};
	query["$set"][`people.${name}.availabilities`] = availabilities;
	await update(names.people, {userID: userID, scheduleName: scheduleName}, query);
}

async function addPlan(userID, scheduleName, utcStart, utcEnd, personName, taskName, category) {
    let newPlan = plans_planSchema(utcStart, utcEnd, personName, taskName, category);
    let plans = (await readPlansRecord(userID, scheduleName)).plans;
    plans.push(newPlan);
    plans = sortRangedObjectArray(plans);
	await update(names.plans, {userID: userID, scheduleName: scheduleName}, {$set: {plans: plans}});
}

async function removePlan(userID, scheduleName, index) {
	let plans = (await readPlansRecord(userID, scheduleName)).plans;
	plans.splice(index, 1);
	await update(names.plans, {userID: userID, scheduleName: scheduleName}, {$set: {plans: plans}});
}

async function updatePlans(userID, scheduleName, plans) {
	await update(names.plans, {userID: userID, scheduleName: scheduleName}, {$set: {plans: plans}});
}

async function accountExists(email) {
	let userData = await read(names.userData, {email: email});
	if (userData !== null) {
		return true;
	}
	else {
		return false;
	}
}

async function addCategory(userID, scheduleName, category) {
    query = {$set: {}};
	query["$set"][`categories.${category}`] = "";
    await update(names.categories, {userID: userID, scheduleName: scheduleName}, query);
}

async function addEvent(userID, scheduleName, start, end, name, category, rrule) {
    const updatedEvent = events_eventSchema(start, end, name, category, rrule);
    await update(names.events, {userID, scheduleName}, {$push: {events: updatedEvent}});
}

async function updateEvent(userID, scheduleName, index, start, end, name, category, rrule) {
    const updatedEvent = events_eventSchema(start, end, name, category, rrule);
    let query = {$set: {}};
    query["$set"][`events.${index}`] = updatedEvent;
    await update(names.events, {userID, scheduleName}, query);
}

async function deleteEvent(userID, scheduleName, index) {
    let query = {$unset: {}};
    query["$unset"][`events.${index}`] = 1;
    await update(names.events, {userID, scheduleName}, query);
    await update(names.events, {userID, scheduleName}, {$pull: {events: null}});
}

// Stripe
async function readStripeCustomerID(userID) {
    const currentRecord = await read(names.stripe, {userID: userID});
    if (currentRecord) {
        return currentRecord.customerId;
    }
    else {
        return null;
    }
}

async function readUserIDfromCustomerId(customerId) {
    const currentRecord = await read(names.stripe, {customerId: customerId});
    if (currentRecord) {
        return currentRecord.userID;
    }
    else {
        return null;
    }
}

async function createStripeCustomerRecord(userID, customerId) {
    const currentId = await readStripeCustomerID(userID);
    if (!currentId) {
        await create(names.stripe, {userID: userID, customerId: customerId});
    }
}

module.exports = {
    connect: connect,

    create: create,
    read: read,
    
    plans_planSchema: plans_planSchema,

	createEmailValidationRecord: createEmailValidationRecord,
	createUserDataRecord: createUserDataRecord,
	createScheduleRecord: createScheduleRecord,
	createPeopleRecord: createPeopleRecord,
    createEventsRecord: createEventsRecord,
    createCategoriesRecord: createCategoriesRecord,
	createPlansRecord: createPlansRecord,
	createAccount: createAccount,
	createOnlineRecord: createOnlineRecord,
	
	removeUserDataRecord: removeUserDataRecord,
	removeEmailValidationRecord: removeEmailValidationRecord,
	removeScheduleRecord: removeScheduleRecord,
	removePeopleRecord: removePeopleRecord,
	removePlansRecord:  removePlansRecord,
    removeOnlineRecord: removeOnlineRecord,
    clearDatabase: clearDatabase,
	
	readUserDataRecord: readUserDataRecord,
	readUserDataRecordFromID: readUserDataRecordFromID,
	readEmailValidationRecord: readEmailValidationRecord,
	readEmailValidationRecordFromEmail: readEmailValidationRecordFromEmail,
	readScheduleRecord: readScheduleRecord,
	readPeopleRecord: readPeopleRecord,
    readEventsRecord: readEventsRecord,
    readCategoriesRecord: readCategoriesRecord,
	readPlansRecord:  readPlansRecord,
    readOnlineRecord: readOnlineRecord,
    getSessionID: getSessionID,
    readRandomScheduleRecord: readRandomScheduleRecord,

    isLoggedIn: isLoggedIn,
    isLoggedInEmail: isLoggedInEmail,
    userIDfromSessionID: userIDfromSessionID,
	changeUserDataEmail: changeUserDataEmail,
	changeUserDataPassword: changeUserDataPassword,
    changeUserDataTier: changeUserDataTier,
    changeUserDataLastUsedSchedule: changeUserDataLastUsedSchedule,
    changeUserDataStripeCustomerId: changeUserDataStripeCustomerId,
	changeScheduleName: changeScheduleName,
	addPerson: addPerson,
	removePerson: removePerson,
	changePersonName: changePersonName,
	changePersonCategories: changePersonCategories,
    addPersonAvailability: addPersonAvailability,
    changePersonAvailability: changePersonAvailability,
	removePersonAvailability: removePersonAvailability,
	addPlan: addPlan,
	removePlan: removePlan,
	updatePlans: updatePlans,
    accountExists: accountExists,
    addCategory: addCategory,
    addEvent: addEvent,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent,
    
    // Stripe
    readStripeCustomerID: readStripeCustomerID,
    readUserIDfromCustomerId: readUserIDfromCustomerId,
    createStripeCustomerRecord: createStripeCustomerRecord
};