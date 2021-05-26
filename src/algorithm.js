const { copyObject, weekMillis, modulo, utcFromWeekMillis } = require('./utilities');
const { DateTime } = require('luxon');

// Assumes range2.start <= range2.end
function insideRange(range1, range2, startKey="start", endKey="end") {
    return range1[startKey] >= range2[startKey] && range1[endKey] <= range2[endKey];
}

function rangesOverlap(range1, range2, startKey="start", endKey="end") {
    return (range1[startKey] >= range2[startKey] && range1[startKey] <= range2[endKey]) || (range1[endKey] <= range2[endKey] && range1[endKey] >= range2[startKey]);
}

// Assumes list is sorted
function overlapSearch(item, list, startKey="start", endKey="end") {
    for (let i = 0; i < list.length; i++) {
        if (rangesOverlap(item, list[i], startKey, endKey)) {
            return true;
        }
    }
    return false;
}

function closestGreaterIndex(list, searchValue, lessThan) {
    if (list.length < 1) {
        return -1;
    }
    let min = 0;
    let max = list.length - 1;
    let index = -1;

    while (min <= max) {
        index = Math.floor((min + max) / 2);
        if (lessThan(list[index], searchValue)) {
            min = index + 1;
        }
        else {
            max = index - 1;
        }
    }
    if (lessThan(list[index], searchValue)) {
        index++;
    }

    if (index > list.length - 1) {
        return -1;
    }
    else {
        return index;
    }
}

function closestLesserIndex(list, searchValue, lessThan) {
    if (list.length < 1) {
        return -1;
    }
    let min = 0;
    let max = list.length - 1;
    let index = -1;

    while (min <= max) {
        index = Math.floor((min + max) / 2);
        if (lessThan(searchValue, list[index])) {
            max = index - 1;
        }
        else {
            min = index + 1;
        }
    }
    if (lessThan(searchValue, list[index])) {
        index--;
    }

    if (index < 0) {
        return -1;
    }
    else {
        return index;
    }
}

// Adds an element to a list but merges the elements if there ranges overlap.
// The range start is found with the startKey and the end with the endKey.
function rangeMerge(
    element,
    list, 
    startKey="start", 
    endKey="end"
    ) {
    if (list.length === 0) {
        return [element];
    }
    let [lowerIndex, lowerRelation] = binaryIndexSearch(element, list, (x, y) => x[startKey] < y[startKey]);
    let searchObj = {};
    searchObj[startKey] = element[endKey];
    let [upperIndex, upperRelation] = binaryIndexSearch(searchObj, list, (x, y) => x[startKey] < y[startKey]);
    
    let newElement = copyObject(element);
    // lowerIndex is replaced
    let previousIndex = lowerIndex - 1
    switch (lowerRelation) {
        case -1:
            if (previousIndex >= 0 && newElement[startKey] <= list[previousIndex][endKey]) {
                newElement[startKey] = list[previousIndex][startKey];
                lowerIndex = previousIndex;
            }
            break;
        case 0:
            break;
        case 1:
            if (newElement[startKey] <= list[lowerIndex][endKey]) {
                newElement[startKey] = list[lowerIndex][startKey];
            }
            else {
                lowerIndex++;
            }
            break;
    }

    previousIndex = upperIndex - 1;
    // upperIndex isn't replaced
    switch (upperRelation) {
        case -1:
            if (previousIndex >= 0 && newElement[endKey] <= list[previousIndex][endKey]) {
                newElement[endKey] = list[previousIndex][endKey];
            }
            break;
        case 0:
            newElement[endKey] = list[upperIndex][endKey];
            upperIndex++;
            break;
        case 1:
            if (newElement[endKey] < list[upperIndex][endKey]) {
                newElement[endKey] = list[upperIndex][endKey];
            }
            upperIndex++;
            break;
    }

    let newList = copyObject(list);
    newList.splice(lowerIndex, upperIndex - lowerIndex, newElement);
    return newList;
}

class Heap {
    // Defaults to min heap.
    constructor(operator=(x, y) => x < y) {
        this._values = [null];
        this._operator = operator;
    }

    insert(element) { // O(logn)
        let cIndex = this._values.length;
        let pIndex = Math.floor(this._values.length / 2);
        this._values.push(element);
        while (cIndex > 1 && this._operator(element, this._values[pIndex])) {
            this._values[cIndex] = this._values[pIndex];
            this._values[pIndex] = element;
            cIndex = pIndex;
            pIndex = Math.floor(cIndex / 2);
        }
    }

    _greatestChildIndex(parentIndex) {
        const childIndex = parentIndex * 2;
        if (childIndex === this._values.length - 1) {
            return childIndex;
        }
        else if (childIndex >= this._values.length) {
            return null;
        }
        else {
            if (this._operator(this._values[childIndex + 1], this._values[childIndex])) {
                return childIndex + 1;
            }
            else {
                return childIndex;
            }
        }
    }

    pop() { // O(logn)
        if (!this.isEmpty()) {
            if (this._values.length == 2) {
                return this._values.pop();
            }
            const popped = this._values[1];
            const last = this._values.pop();
            let pIndex = 1;
            let cIndex = this._greatestChildIndex(pIndex);
            this._values[pIndex] = last;
            while (cIndex !== null && !this._operator(last, this._values[cIndex])) {
                this._values[pIndex] = this._values[cIndex];
                this._values[cIndex] = last;
                pIndex = cIndex;
                cIndex = this._greatestChildIndex(pIndex);
            }
            return popped;
        }
        else {
            return null;
        }
    }

    look() {
        return this._values[Math.min(1, this._values.length - 1)];
    }

    isEmpty() {
        return this._values.length === 1;
    }

    size() {
        return this._values.length - 1;
    }
}

//  Assumes list is sorted
//  returns [index, relation]
//      index: -1 if list is empty, nearby index
//      relation: -1 if lessThanOp(item, list[index]), 1 if lessThanOp(list[index], item), 0 otherWise (if they're equal)
function binaryIndexSearch(item, list, lessThanOp=(x, y) => x < y) {
    let min = 0;
    let max = list.length - 1;
    let i = -1;
    while (min < max) {
        i = Math.floor((max + min) / 2);
        if (lessThanOp(item, list[i])) {
            max = i - 1;
        }
        else if (lessThanOp(list[i], item)) {
            min = i + 1;
        }
        else {
            return [i, 0];
        }
    }
    if (max === -1) {
        return [-1, 0];
    }
    else if (lessThanOp(item, list[max])) {
        return [max, -1]
    }
    else if (lessThanOp(list[max], item)) {
        return [max, 1];
    }
    else {
        return [max, 0];
    }
}

// planDays Helpers

// A(j_o + 2p)
// plans get sliced here
// return timeQueue
function createTimeQueue(people, oldPlans) { 
    let timeMap = {};
    for (let name in people) { // A(p)
        timeMap[name] = 0;
    }

    // A(j_o)
    for (let i = 0; i < oldPlans.length; i++) {
        if (oldPlans[i].personName in timeMap) {
            timeMap[oldPlans[i].personName] += (oldPlans[i].end - oldPlans[i].start);
        }
    }

    // A(p)
    let timeQueue = new Heap((x, y) => x.time < y.time);
    for (let name in timeMap) {
        timeQueue.insert({name: name, time: timeMap[name], lastJob: {start: -1, end: -1}});
    }

    return timeQueue;
}

// A(pp_c)
function createCategorySets(people) { // TODO: figure out why h has an undefined cat and why jgvvu isn't showing any categories
    let categorySets = {};
    for (let name in people) {
        for (let i = 0; i < people[name].categories.length; i++) {
            if (people[name].categories[i] in categorySets) {
                categorySets[people[name].categories[i]].add(name);
            }
            else {
                categorySets[people[name].categories[i]] = new Set();
                categorySets[people[name].categories[i]].add(name);
            }
        }
    }
    return categorySets;
}

function inWeekJobRange(millis, job) {
    if (job.start > job.end) {
        return !(millis > job.start && millis < job.end);
    }
    else {
        return millis > job.start && millis < job.end;
    }
}

// A(logp_e)
// Finds the next or current exception
function nextPersonExceptionOccurance(start, list) {
    const [index, relation] = binaryIndexSearch({start: start}, list, (x, y) => x.start < y.start);
    if (index !== -1) {
        switch (relation) {
            case 0:
                return list[index];
            case -1:
                if (index - 1 >= 0 && start < list[index - 1].end) {
                    return list[index - 1];
                }
                else {
                    return list[index];
                }
            case 1:
                if (start < list[index].end) {
                    return list[index];
                }
                else if (index + 1 < list.length) {
                    return list[index + 1];
                }
                else {
                    return null;
                }
        }
    }
    else {
        return null;
    }
}

// A(logp_w)
// Finds next or current availability
function nextPersonWeekOccurance(start, list) {
    let millis = weekMillis(start);
    const [index, relation] = binaryIndexSearch({start: millis}, list, (x, y) => x.start < y.start);
    if (index !== -1) {
        const nextIndex = modulo(index + 1, list.length);
        const previousIndex = modulo(index + 1, list.length);
        switch (relation) {
            case 0:
                return list[index];
            case -1:
                if (start >= list[previousIndex].end) {
                    return list[index];
                }
                else {
                    return list[previousIndex];
                }
            case 1:
                if (start < list[index].end) {
                    return list[index];
                }
                else {
                    return list[nextIndex];
                }
        }
    }
    else {
        return null;
    }
}

// A(logw)
// Finds next and equal index
function nextWeekJobIndex(start, list) {
    const [index, relation] = binaryIndexSearch({start: weekMillis(start)}, list, (x, y) => x.start < y.start);
    if (index !== -1) {
        const nextIndex = modulo(index + 1, list.length);
        const previousIndex = modulo(index + 1, list.length);
        switch (relation) {
            case 0:
                return index;
            case -1:
                return index;
            case 1:
                if (start < list[index].end) {
                    return index;
                }
                else {
                    return nextIndex;
                }
        }
    }
    else {
        return null;
    }
}

// A(loge_j)
// Finds next or current job
function nextExceptionJobIndex(start, exception) {
    const [index, relation] = binaryIndexSearch({start: start}, exception.jobs, (x, y) => x.start < y.start);
    if (index !== -1) {
        switch (relation) {
            case 0:
                return index;
            case -1:
                if (index - 1 >= 0 && start < exception.jobs[index - 1].end) {
                    return index - 1;
                }
                else {
                    return index;
                }
            case 1:
                if (start < exception.jobs[index].end) {
                    return index;
                }
                else if (index + 1 < exception.jobs.length) {
                    return index + 1;
                }
                else {
                    return null;
                }
        }
    }
    else {
        return null;
    }
}

// A(loge)
// Finds next or current job
function nextExceptionIndex(start, list) {
    const [index, relation] = binaryIndexSearch({start: start}, list, (x, y) => x.start < y.start);
    if (index !== -1) {
        switch (relation) {
            case 0:
                return index;
            case -1:
                if (index - 1 >= 0 && start < list[index - 1].end) {
                    return index - 1;
                }
                else {
                    return index;
                }
            case 1:
                if (start < list[index].end) {
                    return index;
                }
                else if (index + 1 < list.length) {
                    return index + 1;
                }
                else {
                    return null;
                }
        }
    }
    else {
        return null;
    }
}

// A(logp_e + logp_w)
// Fuck these conditionals. Need to find a cleaner method.
function isAvailable(person, job) {
    let nextException = nextPersonExceptionOccurance(job.start, person.exceptions); // A(logp_e)
    let nextAvailability = nextPersonWeekOccurance(job.start, person.week);// A(logp_w)
    if (nextAvailability !== null) {
        nextAvailability = convertWeekRange(job.start, nextAvailability);
    }

    if (nextException !== null && nextAvailability !== null) {
        if (nextException.available) {
            if (rangesOverlap(nextAvailability, nextException)) {
                return insideRange(job, {start: Math.min(nextException.start, nextAvailability.start), end: Math.max(nextException.end, nextAvailability.end)});
            }
            else {
                return insideRange(job, nextException) || insideRange(job, nextAvailability);
            }
        }
        else {
            if (rangesOverlap(nextException, nextAvailability)) { // exception and avail overlap but exception is not available
                if (insideRange(nextException, nextAvailability)) {
                    return insideRange(job, {start: nextAvailability.start, end: nextException.start}) || insideRange(job, {start: nextException.end, end: nextAvailability.end})
                }
                else if (insideRange(nextAvailability, nextException)) {
                    return false;
                }
                else {
                    if (nextAvailability.start < nextException.start) {
                        return insideRange(job, {start: nextAvailability.start, end: nextException.start});
                    }
                    else {
                        return insideRange(job, {start: nextException.end, end: nextAvailability.end});
                    }
                }
            }
            else {
                return insideRange(job, nextAvailability);
            }
        }
    }
    else if (nextException !== null) {
        return nextException.available && insideRange(job, nextException);
    }
    else if (nextAvailability !== null) {
        return insideRange(job, nextAvailability);
    }
    else {
        return false;
    }
}

function convertWeekRange(utc, weekRange) {
    let length = weekRange.end - weekRange.start;
    let start = utcFromWeekMillis(utc, weekRange.start);
    let newRange = copyObject(weekRange);
    newRange.start = start;
    newRange.end = start + length;
    return newRange;
}

function convertToWeekRange(range) {
    let newRange = copyObject(range);
    newRange.start = weekMillis(start);
    newRange.emd = weekMillis(end);
    return newRange;
}

// A(p(logp + logp_e + logp_w) + p)
// O((p(logp + logp_e + logp_w))
function planOne(job, people, timeQueue, categorySets) {
    let timeStorage = [];
    let plan = null;
    while (plan === null && !timeQueue.isEmpty()) { // A(p(logp + logp_e + logp_w))
        let timeItem = timeQueue.pop(); // A(logp)
        let personName = timeItem.name;
        if ( (!rangesOverlap(timeItem.lastJob, job))
        &&  ((job.category === null && isAvailable(people[personName], job)) // A(logp_e + logp_w)
        ||   (job.category !== null && categorySets[job.category].has(personName) && isAvailable(people[personName], job))) ) {
            plan = {start: job.start, end: job.end, personName: personName, taskName: job.taskName, category: job.category};
            timeItem.time += (job.end - job.start);
            timeItem.lastJob = copyObject(job);
        }
        timeStorage.push(timeItem);
    }
    for (let i = 0; i < timeStorage.length; i++) { // A(p)
        timeQueue.insert(timeStorage[i]); // O(1) because timeStorage is sorted correctly
    }
    if (plan === null) {
        return {start: job.start, end: job.end, personName: null, taskName: job.taskName, category: job.category};
    }
    else {
        return plan;
    }
}

// A( j(p(logp + logp_e + logp_w) + p + logw + loge_j) + pp_c + j_o + 2p )
// roughly O(n^2logn)
function planDays(people, week, exceptions, oldPlans, utcStart, utcEnd) {
    let categorySets = createCategorySets(people); // A(pp_c)
    let timeQueue = createTimeQueue(people, oldPlans); // A(j_o + 2p)

    let utc = utcStart;

    let weekIndex = nextWeekJobIndex(utc, week);
    let exceptionIndex = nextExceptionIndex(utc, exceptions);
    let exceptionJobIndex = 0;

    let insideException = false;
    let nextJob = null;
    let plans = [];

    // A( j(p(logp + logp_e + logp_w) + p + logw + loge_j) )
    while (utc < utcEnd) {
        console.log(utc, utcEnd, weekIndex, exceptionIndex)
        if (exceptionIndex !== null && exceptionIndex < exceptions.length && (exceptions[exceptionIndex].start <= utc && utc < exceptions[exceptionIndex].end) ) {
            if (!insideException) {
                insideException = true;
                exceptionJobIndex = nextExceptionJobIndex(utc, exceptions[exceptionIndex]); // A(loge_j)
                if (exceptionJobIndex === null) {
                    utc = exceptions[exceptionIndex].end;
                    continue;
                }
            }
            nextJob = exceptions[exceptionIndex].jobs[exceptionJobIndex];
            exceptionJobIndex++;
            if (exceptionJobIndex >= exceptions[exceptionIndex].jobs.length) {
                utc = exceptions[exceptionIndex].end;
            }
            else {
                utc = exceptions[exceptionIndex].jobs[exceptionJobIndex].start;
            }
        }
        else {
            if (insideException) {
                insideException = false;
                exceptionIndex++;
                weekIndex = nextWeekJobIndex(utc, week); // A(logw)
            }
            if (weekIndex === null) {
                if (exceptionIndex === null || exceptionIndex >= exceptions.length) {
                    break;
                }
                else {
                    utc = exceptions[exceptionIndex].start;
                    continue;
                }
            }
            nextJob = convertWeekRange(utc, week[weekIndex]);
            if (weekIndex === modulo(weekIndex + 1, week.length)) {
                weekIndex = modulo(weekIndex + 1, week.length);
                utc = utcFromWeekMillis(utc + 1, week[weekIndex].start);    
            }
            else {
                weekIndex = modulo(weekIndex + 1, week.length);
                utc = utcFromWeekMillis(utc, week[weekIndex].start);    
            }
        }
        // A(p(logp + logp_e + logp_w) + p)
        plans.push(planOne(nextJob, people, timeQueue, categorySets));
    }
    return plans;
}

module.exports = {
    Heap: Heap,
    binaryIndexSearch: binaryIndexSearch,
    rangeMerge: rangeMerge,
    overlapSearch: overlapSearch,
    planDays: planDays
}

if (require.main === module) {
    let job = {start: 1603821600000, end: 1603825200000, taskName: "sad", category: 2};
    console.log(weekMillis(job.start), weekMillis(job.end))
    let person1 = {
        categories: [2],
        week: [{start: 64800000, end: 75600000}],
        exceptions: []
    }
    let person2 = {
        categories: [2, 4],
        week: [{start: 151200000, end: 154800000}],
        exceptions: []
    }
    console.log(isAvailable(person2, job));
}