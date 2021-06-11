const { categoriesSet, millisecondMap } = require('./constants');
const { DateTime, Interval } = require('luxon');
const _ = require("lodash");

const statusCodes = {
    // Information Responses
    continue: 100,
    switchingProtocol: 101,
    processing: 102,
    earlyHints: 103,

    // Successful Responses
    ok: 200,
    created: 201,
    accepted: 202,
    nonAuthoritativeInformation: 203,
    noContent: 204,
    resetContent: 205,
    partialContent: 206,
    multiStatus: 207,
    alreadyReported: 208,
    imUsed: 226,

    // Redirection Messages
    multipleChoice: 300,
    movedPermanently: 301,
    found: 302,
    seeOther: 303,
    notModified: 304,
    temporaryRedirect: 307,
    permanentRedirect: 308,

    // Client Error Responses
    badRequest: 400,
    unauthorized: 401,
    paymentRequired: 402,
    forbidden: 403,
    notFound: 404,
    methodNotAllowed: 405,
    notAcceptable: 406,
    proxyAuthenticationRequired: 407,
    requestTimeout: 408,
    conflict: 409,
    gone: 410,
    lengthRequired: 411,
    preconditionFailed: 412,
    payloadTooLarge: 413,
    uriTooLong: 414,
    unsupportedMediaType: 415,
    rangeNotSatisfiable: 416,
    expectationFailed: 417,
    teapot: 418,
    misdirectedRequest: 421,
    unprocessableEntity: 422,
    locked: 423,
    failedDependency: 424,
    tooEarly: 425,
    upgradeRequired: 426,
    preconditionRequired: 428,
    tooManyRequests: 429,
    requestHeaderFieldsTooLarge: 431,
    unavailableForLegalReasons: 451,

    // Server Error Responses
    InternalServerError: 500,
    notImplemented: 501,
    badGateway: 502,
    serviceUnavailable: 503,
    gatewayTimeout: 504,
    httpVersionNotSupported: 505,
    variantAlsoNegotiates: 506,
    insufficientStorage: 507,
    loopDetected: 508,
    notExtended: 510,
    networkAuthenticationRequired: 511
};

function authorize(req, res) {
    if (req.session && req.session.sessionID) {
        let userID = await db.userIDfromSessionID(req.session.sessionID);
        if (userID !== null) {
            return userID;
        }
    }
    res.status(statusCodes.unauthorized);
    res.json({message: "You need to be logged in."});
}

function objectMatchesTemplate(obj, template) {
    for (let key in template) {
        if (!(key in obj) || !(typeof template[key] === typeof obj[key])) {
            return false;
        }
    }
    return true;
}

function checkForClientError(req, res, expectedPathParams={}, expectedQueryParams={}, expectedHeaders={}, expectedBody={}, optionalBody=null) {
    let message = "";

    if (!objectMatchesTemplate(req.params, expectedPathParams)) message += `\nInvalid path parameters. Expected Format:\n${JSON.stringify(expectedPathParams)}\n`;
    if (!objectMatchesTemplate(req.query, expectedQueryParams)) message += `\nInvalid query parameters. Expected Format:\n${JSON.stringify(expectedQueryParams)}\n`;
    if (!objectMatchesTemplate(req.headers, expectedHeaders)) message += `\nInvalid header parameters. Expected Format:\n${JSON.stringify(expectedHeaders)}\n`;
    if (!objectMatchesTemplate(req.body, expectedBody)) message += `\nInvalid JSON body. Expected Format:\n${JSON.stringify(expectedBody)}\n`;

    if (message.length > 0) {
        res.status(statusCodes.badRequest);
        res.json({message: optionalBody ? message + `\nOptional JSON body paramters:\n${JSON.stringify(expectedBody)}\n` : message});
    }
}

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
    statusCodes: statusCodes,
    authorize: authorize,
    checkForClientError: checkForClientError,
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