
//-----------------------------------------------------------------------------
// A class that holds an explicit error from the application - as opposed to
// any other Error that could happen
//-----------------------------------------------------------------------------

class ExplicitError extends Error {
    constructor(code, message, link, button) {
        super(message || 'This makes no sense...');
        this.code = code;
        this.link = link;
        this.button = button;
    }

    asJSON() {
        return ({
            error: {
                code: this.code,
                message: this.message,
                link: this.link,
                button: this.button
            }
        });
    }
}

// A factory function to make them

function error(code, message, link, button) {
    return new ExplicitError(code, message, link, button);
}

//-----------------------------------------------------------------------------
// These are errors we report and end up in the error page. The string to the
// right is a code that is displayed to the user when they want to report the
// problem. They are meaningless - just a way to find out where the error came
// from.
//-----------------------------------------------------------------------------


module.exports = {
    // When we fail to validate the user for some reason
    AUTHENTICATION_FAILED:  error.bind(null, 'AUF'),

    // When we validate the user but they are not allowed to use the system
    // because they need an upgrade (supporting member in BAR case)
    MEMBER_NEEDS_UPGRADE:   error.bind(null, 'MNU'),

    // Frag validation failed
    INVALID_FRAG:           error.bind(null, 'INF'),

    // Invalid increment when making frags
    INVALID_INCREMENT:      error.bind(null, 'INI'),

    // The equipment ID is wrong
    INVALID_EQUIPMENT:      error.bind(null, 'INE'),

    // When the user is trying to pass an item they don't have
    NOT_YOURS:              error.bind(null, 'ENY'),

    // When the recipient of a frag or equipment is not valid
    INVALID_RECIPIENT:      error.bind(null, 'INR'),

    // When the user tries to get in line but is already in line
    IN_QUEUE:               error.bind(null, 'UIL'),

    // When the user tries to drop out of line but they are not in line
    NOT_IN_QUEUE:           error.bind(null, 'UNL'),

    // When bad 'rules' are given
    INVALID_RULES:          error.bind(null, 'IRU'),

    // When a bad import is given
    INVALID_IMPORT:         error.bind(null, 'IMP'),

    // A bad thread
    INVALID_THREAD:         error.bind(null, 'ITH'),

    // Invalid phone number for OTP
    INVALID_PHONE_NUMBER:   error.bind(null, 'IPH'),

    // It is too soon to send another OTP
    OTP_TOO_SOON:           error.bind(null, 'OTS'),

    // There is no OTP in the database when the user tries to get in line
    // or there is a request to get in line with not OTP
    NO_OTP:                 error.bind(null, 'NOP'),

    // The user is banned from borrowing equipment
    BANNED:                 error.bind(null, 'BAN'),

    // The OTP in the database is expired
    OTP_TOO_OLD:            error.bind(null, 'OEX'),

    // The user is trying to drop out of an item's queue but
    // they have the item
    CANT_DROP_OUT:          error.bind(null, 'CDO'),

    // When a transfer request doesn't have a correct verb
    BAD_TRANSFER:           error.bind(null, 'BTR'),

    // Not an admin
    NOT_ADMIN:              error.bind(null, 'NAD'),
};

//-----------------------------------------------------------------------------

module.exports.ExplicitError = ExplicitError;
