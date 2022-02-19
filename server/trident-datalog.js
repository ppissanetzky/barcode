'use strict';

const numeral = require('numeral');
const {parse, getUnixTime} = require('date-fns');

const sax = require('./sax.js');

//-----------------------------------------------------------------------------
// Parses the date and attaches the timezone. Returns undefined if something
// is wrong
//-----------------------------------------------------------------------------
// The dates in the data log look like '02/04/2022 00:00:00' and I'm not sure
// whether that is locale specific
//
// The timezone in the data log looks like '-8.00' which appears to be a
// decimal representation. To parse that as an ISO string, we need to convert
// it to -HH:MM
//-----------------------------------------------------------------------------

function parseDate(timezoneString, dateString) {
    let float = parseFloat(timezoneString);
    if (!isNaN(float)) {
        const sign = float < 0 ? '-' : '+';
        float = Math.abs(float);
        const hours = Math.floor(float);
        const minutes = (float - hours) * 60;
        const tz = `${sign}${numeral(hours).format('00')}:${numeral(minutes).format('00')}`;
        const dateWithTimezone = `${dateString} ${tz}`;
        const result = parse(dateWithTimezone, 'MM/dd/yyyy HH:mm:ss xxx', new Date());
        if (!isNaN(result.getTime())) {
            return result;
        }
    }
}

//-----------------------------------------------------------------------------
// Maps the type strings in the data log to our entry types
//-----------------------------------------------------------------------------

const TYPE_MAP = {
    alk: 6,
    ca: 7,
    mg: 8
};

//-----------------------------------------------------------------------------

async function parseTridentDataLog(xmlStream) {
    return new Promise((resolve, reject) => {
        const result = {
            invalid: 0,
            entries: []
        };
        const state = {
            timezone: null,
            date: null,
            type: null,
            last: {
                alk: null,
                ca: null,
                mg: null
            }
        };
        const plucks = {
            'datalog/timezone': (text) => {
                state.timezone = text;
            },
            'open:datalog/record': () => {
                state.date = null;
                state.type = null;
            },
            'datalog/record/date': (text) => {
                state.date = text;
                state.type = null;
            },
            'datalog/record/probe/type': (text) => {
                state.type = text;
            },
            'datalog/record/probe/value': (text) => {
                const {type} = state;
                const entryTypeId = TYPE_MAP[type];
                if (entryTypeId) {
                    const last = state.last[type];
                    if (text !== last) {
                        state.last[type] = text;
                        const date = parseDate(state.timezone, state.date);
                        if (!date) {
                            result.invalid++;
                            return;
                        }
                        const time = getUnixTime(date);
                        const value = parseFloat(text);
                        if (isNaN(value)) {
                            result.invalid++;
                            return;
                        }
                        result.entries.push({
                            entryTypeId,
                            time,
                            value
                        });
                    }
                }
            }
        };
        const path = [];
        const stream = sax.createStream(true, {
            trim: true
        });
        stream.on('error', (error) => {
            reject(error);
        });
        stream.on('opentag', ({name}) => {
            path.push(name);
            const pluck = plucks[`open:${path.join('/')}`];
            if (pluck) {
                pluck();
            }
        });
        stream.on('text', (text) => {
            const pluck = plucks[path.join('/')];
            if (pluck) {
                pluck(text);
            }
        });
        stream.on('closetag', (name) => {
            const last = path.pop();
            if (last !== name) {
                throw new Error(`${path.join('/')} : close ${name}`);
            }
        });
        stream.on('end', () => resolve(result));

        xmlStream.on('error', (error) => reject(error));
        xmlStream.pipe(stream);
    });
}

module.exports = {
    parseTridentDataLog
};
