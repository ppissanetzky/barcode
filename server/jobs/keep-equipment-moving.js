
const _ = require('lodash');
const ordinal = require('ordinal');

const {lock} = require('../lock');

const db = require('../equipment-database');
const {makeEquipmentQueue} = require('../equipment-queue');
const {getDistanceMatrix} = require('../places/distance');
const {uberPost} = require('../forum');
const systemSettings = require('../system-settings');

lock('keep-equipment-moving', async () => {
    const {items} = db.getAllItems(0);

    for (const item of items) {
        // We will warn only if the item has been available for maxDays
        const warnAfterDays = item.maxDays;
        // Get the queue for this item
        const queue = await makeEquipmentQueue(item.itemId);
        const {haves, waiters} = queue;
        // This is an array of entries that have been available too long
        // sorted in descending order by daysAvailable
        const available = _.sortBy(haves.filter(({daysAvailable}) =>
            daysAvailable > warnAfterDays), 'daysAvailable').reverse();

        // None available or no one waiting
        if (available.length === 0 || waiters.length === 0) {
            continue;
        }

        // Get the distance matrix between all the available locations
        // and all the waiting destinations
        const origins = available.map(({location}) => location);
        const destinations = waiters.map(({location}) => location);
        const distanceMatrix = await getDistanceMatrix(origins, destinations);

        // Flatten the results and keep only those that are valid.
        // Sort in ascending order by duration.
        const flatMatrix = _.sortBy(distanceMatrix.flat()
            .filter((item) => item), ['duration', 'destinationIndex']);

        // Use this set to track which ones have been allocated already
        const allocated = new Set();

        // Now, iterate over the flat matrix. The candidates are in order by
        // duration, so we're allocating them to the available ones in
        // order.
        for (const candidate of flatMatrix) {
            const {originIndex, originName, destinationIndex, destinationName} = candidate;
            // If we have already allocated this candidate, skip it
            if (allocated.has(destinationIndex)) {
                continue;
            }
            // These are the entries from 'available' and 'waiters'
            const source = available[originIndex];
            const target = waiters[destinationIndex];
            // If we have more than this many, skip it
            if (source.distances?.length >= systemSettings.equipmentReadyCandidates) {
                continue;
            }
            // Otherwise, mark it as allocated
            allocated.add(destinationIndex);
            // If the source doesn't yet have a distances array, create it
            if (!source.distances) {
                source.distances = [];
            }
            // Now, add this candidate to the source
            source.distances.push({
                ...target,
                ...candidate,
                ordinal: ordinal(destinationIndex + 1),
                same: originName === destinationName
            });
        }

        /*
        for (const source of available) {
            const {distances} = source;
            console.log(source.user.name, source.location, source.ageAvailable);
            if (!distances) {
                console.log('  No destinations');
                continue;
            }
            for (const distance of distances) {
                console.log(' ', distance.user.name,
                    distance.destinationName,
                    ':',
                    distance.daysWaiting + ' days',
                    distance.durationText,
                    ':',
                    distance.ordinal
                );
            }
        }
        */

        // Post to the forum
        uberPost(item.threadId, 'equipment-lazy', {item, queue, available});
    }
});
