const _ = require('lodash');
const ordinal = require('ordinal');

const {Client} = require('@googlemaps/google-maps-services-js');

const {BC_GOOGLE_API_KEY} = require('../barcode.config');

const Places = require('./places');

/*
async function findPlace(text) {
    if (!text) {
        return;
    }
    const client = new Client();
    const response = await client.findPlaceFromText({
        params: {
            key: API_KEY,
            input: text,
            // Using San Jose's lat/long as the location bias
            locationbias: 'point:37.3382,121.8863',
            inputtype: 'textquery',
            fields: ['name', 'place_id', 'formatted_address', 'geometry']
        }
    });

    const {data: {candidates}} = response;

    if (candidates && candidates.length > 0) {
        console.log(`SEARCH FOR "${text}"`, JSON.stringify(candidates, null, 2));
        // Get the first candidate
        const [{
            place_id,
            name,
            formatted_address,
            geometry: {location: {lat, lng}}}] = candidates;
        // Return info about the place
        return {
            name,
            id: place_id,
            address: formatted_address,
            location: [lat, lng]
        };
    }
}
*/

//-----------------------------------------------------------------------------
// Takes a Place object and finds the nearest locality place ID. Keeps a cache
//-----------------------------------------------------------------------------

const placeIdCache = new Map();

async function reverseGeocode(place) {
    const existing = placeIdCache.get(place.name);
    if (existing) {
        return existing;
    }
    const client = new Client();
    const {data} = await client.reverseGeocode({
        params: {
            key: BC_GOOGLE_API_KEY,
            latlng: place.coordinates,
            // eslint-disable-next-line camelcase
            result_type: ['locality']
        }
    });
    if (data?.status === 'OK') {
        // console.log('RG\n', place, JSON.stringify(data.results, null, 2));
        const [{place_id: placeId}] = data.results;
        // Cache it
        if (placeId) {
            placeIdCache.set(place.name, placeId);
        }
        return placeId;
    }
}

async function getDistanceMatrix(origins, destinations) {
    const client = new Client();
    // Find all of the places and put them in an array
    // including the index in the original array
    const originPlaces = [];
    for (const [index, origin] of origins.entries()) {
        const place = Places.fuzzySearch(origin);
        if (place) {
            const placeId = await reverseGeocode(place);
            if (placeId) {
                originPlaces.push({index, place, placeId});
            }
        }
    }
    const destinationPlaces = [];
    for (const [index, destination] of destinations.entries()) {
        const place = Places.fuzzySearch(destination);
        if (place) {
            const placeId = await reverseGeocode(place);
            if (placeId) {
                destinationPlaces.push({index, place, placeId});
            }
        }
    }
    // console.log('ORIGIN PLACES\n', JSON.stringify(originPlaces, null, 2));
    // console.log('DESTINATION PLACES\n', JSON.stringify(destinationPlaces, null, 2));
    // Now, compose the distance matrix request
    const params = {
        key: BC_GOOGLE_API_KEY,
        origins: originPlaces.map(({placeId}) => `place_id:${placeId}`),
        destinations: destinationPlaces.map(({placeId}) => `place_id:${placeId}`),
        units: 'imperial'
    };
    // console.log('PARAMS\n', JSON.stringify(params, null, 2));
    const {data} = await client.distancematrix({params});
    // console.log('RESPONSE\n', JSON.stringify(data, null, 2));

    const {rows} = data;

    const result = origins.map(() => destinations.map(() => undefined));

    rows.forEach((row, rowIndex) => {
        const {elements} = row;
        elements.forEach((element, elementIndex) => {
            const {status, distance, duration} = element;
            if (status === 'OK' && distance && duration) {
                result[originPlaces[rowIndex].index][destinationPlaces[elementIndex].index] = {
                    origin: origins[originPlaces[rowIndex].index],
                    originIndex: originPlaces[rowIndex].index,
                    originName: originPlaces[rowIndex].place.name,
                    destination: destinations[destinationPlaces[elementIndex].index],
                    destinationName: destinationPlaces[elementIndex].place.name,
                    destinationIndex: destinationPlaces[elementIndex].index,
                    distanceText: distance.text,
                    distance: distance.value,
                    durationText: duration.text,
                    duration: duration.value
                };
            }
        });
    });

    return result;
}

async function getNearest(origin, destinations) {
    const matrix = await getDistanceMatrix([origin], destinations);
    const result = [];
    const [first] = matrix;
    first.forEach((destination, index) => {
        if (destination) {
            result.push({
                ...destination,
                index,
                ordinal: ordinal(index + 1),
                same: destination.originName === destination.destinationName
            });
        }
    });
    return _.sortBy(result, ['duration']);
}

module.exports = {
    getDistanceMatrix,
    getNearest
};
