/*

This wraps around a JSON file of places that was automatically
generated as follows:

 Visit https://data.sacog.org/datasets/SACOG::census-designated-places-cdps-2010-california/explore?showTable=true
 This is a list of CA "census designated places" - not just cities

 Downloaded the entire table as a GeoJSON file

 Used jq to grab just the names and lat/longs for any places that fit inside
 a lat/long box I came up with:
     south of Sacramento,
     north of Greenfield
     west of Merced

 While technically larger than the Bay Area, I know we have some members out there.
 This reduced the list from 1523 to 405 places.

 This is the command I used:
 cat Census_Designated_Places_\(CDPs\)_2010_-_California.geojson | \
     jq '[.features[].properties | select((.INTPTLAT10|tonumber) < 38.62194360868584 and (.INTPTLAT10|tonumber) > 36.34975838804372 and (.INTPTLON10|tonumber) < -120.4598722519202) | [.NAME10, (.INTPTLAT10|tonumber) ,(.INTPTLON10|tonumber)]] | sort' > places.json

*/

const Fuse = require('fuse.js');

const places = require('./places.json');

const names = places.map(([name]) => name);

//-----------------------------------------------------------------------------

class Place {
    constructor(tuple) {
        const [name, lat, long] = tuple;
        this.name = name;
        this.lat = lat;
        this.long = long;
    }

    get coordinates() {
        return [this.lat, this.long];
    }
}

//-----------------------------------------------------------------------------
// Fuzzy search
// Returns a Place or undefined
//-----------------------------------------------------------------------------

const fuse = new Fuse(names);

function fuzzySearch(text) {
    if (text) {
        const [match] = fuse.search(text);
        if (match) {
            return new Place(places[match.refIndex]);
        }
    }
}

//-----------------------------------------------------------------------------
// An array of the names
//-----------------------------------------------------------------------------

function getListOfPlaceNames() {
    return names;
}

//-----------------------------------------------------------------------------

module.exports = {
    fuzzySearch,
    getListOfPlaceNames
};
