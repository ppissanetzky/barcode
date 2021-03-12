'use strict';

const qs = require('querystring');
const axios = require('axios');

const {BC_XF_API_KEY, BC_XF_API_URL} = require('./barcode.config');

//-----------------------------------------------------------------------------
// A client that always includes the API key header and uses the same base URL
//-----------------------------------------------------------------------------

const API_KEY_HEADER = {
    'XF-Api-Key': BC_XF_API_KEY
};

const client = axios.create({
    baseURL: BC_XF_API_URL,
    headers: API_KEY_HEADER
});

//-----------------------------------------------------------------------------
// To catch API errors and throw them
//-----------------------------------------------------------------------------

client.interceptors.response.use((response) => {
    const {request: {path}, data} = response;
    if (data && (data.error || data.errors)) {
        throw new Error(`XF API response from "${path}" has errors :\n${data}`);
    }
    return response;
});

//-----------------------------------------------------------------------------

async function get(path, params, headers) {
    const {data} = await client.get(path, {params, headers});
    return data;
}

//-----------------------------------------------------------------------------

const POST_CONTENT_TYPE = {
    'content-type': 'application/x-www-form-urlencoded'
};

async function post(path, params, headers) {
    const {data} = await client.post(path, qs.stringify(params), {
        headers: {...headers, ...POST_CONTENT_TYPE}
    });
    return data;
}

//-----------------------------------------------------------------------------

module.exports = {
    get,
    post
};