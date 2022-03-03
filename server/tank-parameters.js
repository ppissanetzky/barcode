'use strict';

const numeral = require('numeral');
const _ = require('lodash');

const {
    age,
    differenceInDays,
    strictDifferenceToNow,
    fromUnixTime,
    toUnixTime
} = require('./dates');

//-----------------------------------------------------------------------------
// Number of days after which a parameter is considered 'old'
//-----------------------------------------------------------------------------
// This, as well as low and high values are subjective
//-----------------------------------------------------------------------------

const OLD_DAYS = 14;

//-----------------------------------------------------------------------------

function parameterInfo(row) {
    const {name, color, format, units, time, value} = row;
    const text = numeral(value).format(format);
    const textWithUnits = units ? text + ` ${units}` : text;
    const date = fromUnixTime(time);
    const ageText = age(date, 'today', 'ago');
    const days = differenceInDays(new Date(), date);
    const old = days > OLD_DAYS;

    return {
        name,
        text,
        textWithUnits,
        units,
        age: ageText,
        days,
        old,
        color
    };
}

function getText(row) {
    const {format, units, value, comment} = row;
    let text = '';
    if (value !== null) {
        text = `${numeral(value).format(format)} ${units}`;
    }
    if (text && comment) {
        text += ' / ';
    }
    if (comment) {
        text += comment;
    }
    return text;
}

function noteInfo(row) {
    const {name, color, units, time} = row;
    const text = getText(row);
    const date = fromUnixTime(time);
    const ageText = age(date, 'today', 'ago');
    const days = differenceInDays(new Date(), date);
    const old = days > OLD_DAYS;

    return {
        name,
        text,
        units,
        age: ageText,
        days,
        old,
        color
    };
}

function entryInfo(entryType, row) {
    const info = {...entryType, ...row};
    const result = info.isTracked ? parameterInfo(info) : noteInfo(info);
    return {
        rowid: info.rowid,
        type: info.entryTypeId,
        time: info.time,
        value: _.isNumber(info.value) ? info.value : undefined,
        text: getText(info),
        age: strictDifferenceToNow(fromUnixTime(info.time)) + ' ago',
        name: result.name,
        color: result.color
    };
}

function fragJournalInfo(entryType, frag, journal) {
    const {timestamp} = journal;
    return {
        rowid: `fj-${journal.journalId}`,
        type: entryType.entryTypeId,
        time: toUnixTime(timestamp),
        text: `${frag.name} / ${journal.notes || journal.entryType}`,
        age: strictDifferenceToNow(timestamp) + ' ago',
        name: entryType.name,
        color: entryType.color,
        external: Boolean(entryType.external),
        url: `/frag/${frag.fragId}`
    };

}

//-----------------------------------------------------------------------------

module.exports = {
    parameterInfo,
    noteInfo,
    entryInfo,
    fragJournalInfo
};
