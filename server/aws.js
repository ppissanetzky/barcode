const assert = require('assert');
const _ = require('lodash');

// AWS SNS - for sending OTP via SMS
const {SNSClient, PublishCommand} = require('@aws-sdk/client-sns');

const {BC_SMS_MODE} = require('./barcode.config');

//-----------------------------------------------------------------------------
// Phone number must be 10 digits
//-----------------------------------------------------------------------------

function validatePhoneNumber(phoneNumber) {
    return phoneNumber &&
        _.isString(phoneNumber) &&
        phoneNumber.length === 10 &&
        /\d{10}/.test(phoneNumber);
}

//-----------------------------------------------------------------------------
// Use AWS to send the SMS. Credentials are in the environment
//-----------------------------------------------------------------------------

async function sendSms(phoneNumber, message) {
    assert(validatePhoneNumber(phoneNumber), 'Invalid phone number');
    assert(message, 'Empty message');

    if (BC_SMS_MODE !== 'production') {
        console.log('SMS sending disabled, would send to', phoneNumber, ':', `"${message}"`);
        return;
    }

    const client = new SNSClient({region: 'us-west-1'});
    return await client.send(new PublishCommand({
        Message: message,
        PhoneNumber: `+1${phoneNumber}`,
    }));
}

//-----------------------------------------------------------------------------

module.exports = {
    validatePhoneNumber,
    sendSms
};