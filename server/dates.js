
// ----------------------------------------------------------------------------
// This is used by both the server and the web app
// ----------------------------------------------------------------------------

const {
    parseISO,
    differenceInDays,
    formatDistance,
    addDays,
    addYears,
    fromUnixTime,
    getUnixTime,
    formatDistanceToNowStrict,
    format
} = require('date-fns');

// ----------------------------------------------------------------------------

function nowAsIsoString() {
    return utcIsoStringFromDate(new Date());
}

// ----------------------------------------------------------------------------
// Parses an ISO string and returns a Date object
// ----------------------------------------------------------------------------

function dateFromIsoString(string) {
    return parseISO(string);
}

// ----------------------------------------------------------------------------

function validIsoString(string) {
    try {
        const date = dateFromIsoString(string);
        return (date instanceof Date) && !isNaN(date);
    }
    catch {
        return false;
    }
}

// ----------------------------------------------------------------------------

function justTheUtcDate(stringOrDate) {
    if (stringOrDate instanceof Date) {
        return utcIsoStringFromDate(stringOrDate).slice(0, 10);
    }
    return utcIsoStringFromString(stringOrDate).slice(0, 10);
}

function justTheLocalDate(stringOrDate) {
    const date = stringOrDate instanceof Date ? stringOrDate : dateFromIsoString(stringOrDate);
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(date - tzoffset)).toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// From MDN
// ----------------------------------------------------------------------------
// The toISOString() method returns a string in simplified extended ISO format
// (ISO 8601), which is always 24 or 27 characters long
// (YYYY-MM-DDTHH:mm:ss.sssZ or ±YYYYYY-MM-DDTHH:mm:ss.sssZ, respectively).
// The timezone is always zero UTC offset, as denoted by the suffix "Z".
// ----------------------------------------------------------------------------

function utcIsoStringFromDate(date) {
    return date.toISOString();
}

function utcIsoStringFromUnixTime(t) {
    return utcIsoStringFromDate(fromUnixTime(t));
}

// ----------------------------------------------------------------------------
// This one takes an ISO string and returns a UTC ISO string.
// We have to make sure it works for a date only.
// For example:
//  The string '2021-01-18' in Pacific time should end up as
//  '2021-01-18T08:00:00.000Z'
// ----------------------------------------------------------------------------

function utcIsoStringFromString(string) {
    return utcIsoStringFromDate(dateFromIsoString(string));
}

// ----------------------------------------------------------------------------

function dateFromIsoStringOrDate(date) {
    return date instanceof Date ? date : dateFromIsoString(date);
}

// ----------------------------------------------------------------------------
// This one returns a human readable difference between two dates such as
// "2 months". If the difference is less than one day, it returns textForToday.
// Otherwise it returns the difference with the suffix if any.
// ----------------------------------------------------------------------------

function ageSince(oldIsoStringOrDate, newIsoStringOrDate, textForToday, suffix) {
    const newDate = dateFromIsoStringOrDate(newIsoStringOrDate);
    const oldDate = dateFromIsoStringOrDate(oldIsoStringOrDate);
    if (differenceInDays(newDate, oldDate) < 1) {
        return textForToday;
    }
    return `${formatDistance(newDate, oldDate)}${suffix ? ' ' + suffix : ''}`;
}

// ----------------------------------------------------------------------------

function age(isoStringDateOrDate, textForToday, suffix) {
    return ageSince(isoStringDateOrDate, new Date(), textForToday, suffix);
}

// ----------------------------------------------------------------------------

function differenceBetween(isoStringOrDateThen, isoStringOrDateNow) {
    return formatDistance(dateFromIsoStringOrDate(isoStringOrDateNow),
        dateFromIsoStringOrDate(isoStringOrDateThen));
}

function differenceToNow(isoStringOrDateThen) {
    return formatDistance(new Date(), dateFromIsoStringOrDate(isoStringOrDateThen));
}

function strictDifferenceToNow(isoStringOrDateThen) {
    return formatDistanceToNowStrict(dateFromIsoStringOrDate(isoStringOrDateThen));
}

// ----------------------------------------------------------------------------

function toUnixTime(isoStringOrDate) {
    return getUnixTime(dateFromIsoStringOrDate(isoStringOrDate));
}

function nowAsUnixTime() {
    return getUnixTime(new Date());
}

// ----------------------------------------------------------------------------

module.exports = {
    age,
    ageSince,
    utcIsoStringFromDate,
    utcIsoStringFromString,
    utcIsoStringFromUnixTime,
    dateFromIsoString,
    nowAsIsoString,
    differenceBetween,
    differenceInDays,
    differenceToNow,
    formatDistance,
    justTheUtcDate,
    justTheLocalDate,
    addDays,
    addYears,
    validIsoString,
    fromUnixTime,
    toUnixTime,
    nowAsUnixTime,
    strictDifferenceToNow,
    format
};
