
const {getNearest} = require('../places/distance');

describe('Distance', () => {

    it('should calculate nearest correctly', async () => {
        const origin = 'San Francisco';
        const destinations = [
            'San Ramon',
            'Cupertino San Jose',
            'Daly city',
            '',
            'Crockett'
        ];

        const expected = [{
            origin: 'San Francisco',
            originName: 'San Francisco',
            destination: 'Daly city',
            destinationName: 'Daly City',
            // distanceText: '9.6 mi',
            // distance: 15502,
            // durationText: '13 mins',
            // duration: 797,
            index: 2,
            same: false,
            ordinal: '3rd'
        },
        {
            origin: 'San Francisco',
            originName: 'San Francisco',
            destination: 'Crockett',
            destinationName: 'Crockett',
            // distanceText: '29.2 mi',
            // distance: 46936,
            // durationText: '34 mins',
            // duration: 2035,
            index: 4,
            same: false,
            ordinal: '5th'
        },
        {
            origin: 'San Francisco',
            originName: 'San Francisco',
            destination: 'San Ramon',
            destinationName: 'San Ramon',
            // distanceText: '36.2 mi',
            // distance: 58248,
            // durationText: '39 mins',
            // duration: 2339,
            index: 0,
            same: false,
            ordinal: '1st'
        },
        {
            origin: 'San Francisco',
            originName: 'San Francisco',
            destination: 'Cupertino San Jose',
            destinationName: 'Cupertino',
            // distanceText: '43.4 mi',
            // distance: 69792,
            // durationText: '47 mins',
            // duration: 2803,
            index: 1,
            same: false,
            ordinal: '2nd'
        }];

        const nearest = await getNearest(origin, destinations);

        expect(nearest).toHaveLength(4);

        // Because distance and duration could vary based on current
        // conditions, we just check the basics and remove them
        nearest.forEach((entry) => {
            const {distanceText, distance, durationText, duration} = entry;
            expect(distanceText).toMatch(/^[\d.]* mi$/);
            expect(distance).toBeGreaterThan(0);
            expect(durationText).toMatch(/^[\d.]* mins$/);
            expect(duration).toBeGreaterThan(0);

            delete entry.distanceText;
            delete entry.distance;
            delete entry.durationText;
            delete entry.duration;
        });

        expect(nearest).toEqual(expected);
    });
});
