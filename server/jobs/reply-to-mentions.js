
const {lock} = require('../lock');
const {BARCODE_USER, getAlerts, getPost} = require('../xenforo');
const {getSettings, setSetting} = require('../user-database');
const {getMotherForThread} = require('../dbtc-database');
const {getItemForThread} = require('../equipment-database');
const {dateFromIsoString, toUnixTime} = require('../dates');
const {uberPost} = require('../forum');
const debug = require('debug')('barcode:reply-to-mentions');

lock('reply-to-mentions', async () => {

    const now = new Date();

    // Get the last alert date - ISO DT
    const {lastAlertDate} = getSettings(BARCODE_USER);

    // And then set it to now
    setSetting(BARCODE_USER, 'lastAlertDate', now.toISOString());

    // If we didn't have one to begin with, bail
    if (!lastAlertDate) {
        debug('No last alert date');
        return;
    }

    debug('Last alert date is', lastAlertDate);

    // Convert to Unix epoch
    const lastAlertTime = toUnixTime(lastAlertDate);

    // Get all the alerts that are after our last alert time,
    // are mentions and are in a post
    const alerts = (await getAlerts()).filter(({action, event_date, content_type}) =>
        event_date > lastAlertTime &&
        action === 'mention' &&
        content_type === 'post');

    if (!alerts.length) {
        debug ('No new mentions');
        return;
    }

    debug('New mentions', alerts.length);

    for (const alert of alerts) {
        const {content_id, alert_text} = alert;
        debug(alert_text, 'in post', content_id);
        // Get information about the post
        const post = await getPost(content_id);
        const {thread_id, user_id} = post;
        debug('Thread', thread_id, 'user', user_id);
        // See if there is a mother associated with this thread
        const mother = getMotherForThread(thread_id);
        debug('Mother', mother);
        // See if there is a piece of equipment associated with the thread
        const item = getItemForThread(thread_id);
        debug('Item', item);
        // Now post with all the context without waiting
        uberPost(thread_id, 'reply-to-mention', {
            userId: user_id,
            mother, // Can be undefined
            item // Can be undefined
        });
    }
});