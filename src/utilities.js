const { categoriesSet, millisecondMap } = require('./constants');
const { DateTime, Interval } = require('luxon');
const _ = require("lodash");

function invert(obj) {
    return _.invert(obj);
}

function validRange(range, startKey="start", endKey="end") {
    return typeof(range[startKey]) === "number" && typeof(range[endKey]) === "number";
}

function modulo(n, m) {
    return ((n % m) + m) % m;
}

function weekMillis(utc) {
    return Interval.fromDateTimes(DateTime.fromMillis(utc).set({weekday: 1, hour: 0, minute: 0, second: 0, millisecond: 0}), DateTime.fromMillis(utc)).length("milliseconds");
}

function utcFromWeekMillis(utcEarlier, millis) {
    let earlierMillis = weekMillis(utcEarlier);
    if (millis < earlierMillis) {
        return utcEarlier + millis + (millisecondMap.week - earlierMillis);
    }
    else {
        return utcEarlier + millis - earlierMillis;
    }
}

function weekJobLength(job) {
    if (job.end < job.start) {
        return millisecondMap.week - job.start + job.end;
    }
    else {
        return job.end - job.start;
    }
}

function copyObject(obj) {
    return _.cloneDeep(obj);
}

function sortRangedObjectArray(array, startKey="start") {
    return array.sort((x, y) => x[startKey] - y[startKey]);
}

function makeID(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

function checkName(name, record) {
    if (name.length < 1) {
        return false;
    }
    if (name.replace(/\s/g, '').length < 1) {
        return false;
    }
    if (name in record) {
        return false;
    }
    return true;
}

function localDate(utc) {
    return DateTime.fromMillis(utc).setZone(DateTime.local().zoneName);
}

module.exports = {
    copyObject: copyObject,
    checkName: checkName,
    makeID: makeID,
    sortRangedObjectArray: sortRangedObjectArray,
    weekMillis: weekMillis,
    modulo: modulo,
    utcFromWeekMillis: utcFromWeekMillis,
    weekJobLength: weekJobLength,
    validRange: validRange,
    localDate: localDate,
    invert: invert
}