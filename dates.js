
// ----------------------------------------------------------------------------
// This is used by both the server and the web app
// ----------------------------------------------------------------------------

const { parseISO, differenceInDays, formatDistance } = require('date-fns')

// ----------------------------------------------------------------------------

function nowAsIsoString () {
  return utcIsoStringFromDate(new Date())
}

// ----------------------------------------------------------------------------
// Parses an ISO string and returns a Date object
// ----------------------------------------------------------------------------

function dateFromIsoString (string) {
  return parseISO(string)
}

// ----------------------------------------------------------------------------
// From MDN
// ----------------------------------------------------------------------------
// The toISOString() method returns a string in simplified extended ISO format
// (ISO 8601), which is always 24 or 27 characters long
// (YYYY-MM-DDTHH:mm:ss.sssZ or ±YYYYYY-MM-DDTHH:mm:ss.sssZ, respectively).
// The timezone is always zero UTC offset, as denoted by the suffix "Z".
// ----------------------------------------------------------------------------

function utcIsoStringFromDate (date) {
  return date.toISOString()
}

// ----------------------------------------------------------------------------
// This one takes an ISO string and returns a UTC ISO string.
// We have to make sure it works for a date only.
// For example:
//  The string '2021-01-18' in Pacific time should end up as
//  '2021-01-18T08:00:00.000Z'
// ----------------------------------------------------------------------------

function utcIsoStringFromString (string) {
  return utcIsoStringFromDate(dateFromIsoString(string))
}

// ----------------------------------------------------------------------------
// This one returns a human readable difference between now and the given ISO
// string date or Date object, such as "2 months". If the difference is less
// than one day, it returns textForToday. Otherwise it returns the difference
// with the suffix if any
// ----------------------------------------------------------------------------

function age (isoStringDateOrDate, textForToday, suffix) {
  const today = new Date()
  const then = (isoStringDateOrDate instanceof Date)
    ? isoStringDateOrDate
    : dateFromIsoString(isoStringDateOrDate)
  if (differenceInDays(today, then) < 1) {
    return textForToday
  }
  return `${formatDistance(today, then)}${suffix ? ' ' + suffix : ''}`
}

// ----------------------------------------------------------------------------

module.exports = {
  age,
  utcIsoStringFromDate,
  utcIsoStringFromString,
  dateFromIsoString,
  nowAsIsoString
}
