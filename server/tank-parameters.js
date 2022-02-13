'use strict';

const numeral = require('numeral');
const {age, differenceInDays, dateFromIsoString} = require('./dates');

//-----------------------------------------------------------------------------
// Number of days after which a parameter is considered 'old'
//-----------------------------------------------------------------------------
// This, as well as low and high values are subjective
//-----------------------------------------------------------------------------

const OLD_DAYS = 14;
const OLD_COLOR = 'grey lighten-3';

//-----------------------------------------------------------------------------

const PARAMETERS = {

    alkalinity: {
        abbreviation: 'Alk',
        format: '0.00',
        unit: 'dKH',
        low: 7,
        high: 12,
        color: 'deep-purple lighten-5'
    },

    calcium: {
        abbreviation: 'Ca',
        format: '0',
        unit: 'ppm',
        low: 350,
        high: 550,
        color: 'purple lighten-5'
    },

    magnesium: {
        abbreviation: 'Mg',
        format: '0',
        unit: 'ppm',
        low: 1100,
        high: 1500,
        color: 'indigo lighten-5'
    },

    nitrate: {
        abbreviation: 'NO\u2083',
        format: '0',
        unit: 'ppm',
        low: 0,
        high: 90,
        color: 'orange lighten-5'
    },

    phosphate: {
        abbreviation: 'PO\u2084',
        format: '0.00',
        unit: 'ppm',
        low: 0,
        high: 1,
        color: 'cyan lighten-5'
    },

    salinity: {
        abbreviation: 'S.G.',
        format: '0.000',
        unit: '',
        low: 1.024,
        high: 1.027,
        color: 'amber lighten-5'
    }
};

//-----------------------------------------------------------------------------

function parameterInfo(timestamp, name, value) {
    const p = PARAMETERS[name];
    if (!p) {
        return;
    }
    const text = numeral(value).format(p.format);
    const textWithUnits = p.unit ? text + ` ${p.unit}` : text;
    const low = value < p.low;
    const high = value > p.high;
    const abbreviation = p.abbreviation;
    const ageText = age(timestamp, 'today', 'ago');
    const days = differenceInDays(new Date(), dateFromIsoString(timestamp));
    const old = days > OLD_DAYS;
    const color = old ? OLD_COLOR : p.color;

    return {
        abbreviation,
        text,
        textWithUnits,
        units: p.unit,
        low,
        high,
        age: ageText,
        days,
        old,
        color
    };
}

//-----------------------------------------------------------------------------

const JOURNAL_TYPES = [
    {label: 'Note', type: 'note', color: 'brown lighten-5'},
    {label: 'Good', type: 'good', color: 'green lighten-5'},
    {label: 'Bad', type: 'bad', color: 'red lighten-5'},
    {label: 'Maintenance', type: 'maintenance', color: 'blue-grey lighten-5'},
    {label: 'Water change', type: 'wc', value: true, unit: 'Gallons', color: 'light-blue lighten-5'},
];

Object.keys(PARAMETERS).forEach((key) => {
    const {abbreviation, format, unit, color} = PARAMETERS[key];
    JOURNAL_TYPES.push({
        label: abbreviation,
        value: true,
        unit,
        type: 'parameter',
        subType: key,
        format,
        color
    });
});

//-----------------------------------------------------------------------------

module.exports = {
    parameterInfo,
    JOURNAL_TYPES
};
