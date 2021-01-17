
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
};

//-----------------------------------------------------------------------------

module.exports.ExplicitError = ExplicitError;
