
const {lock} = require('../lock');
const {BARCODE_USER, getAlerts, getPost} = require('../xenforo');
const {getSettings, setSetting} = require('../user-database');
const {getMotherForThread} = require('../dbtc-database');
const {getItemForThread} = require('../equipment-database');
const {dateFromIsoString} = require('../dates');
const {uberPost} = require('../forum');

lock('reply-to-mentions', async () => {

    const now = new Date();

    // Get the last alert date - ISO DT
    const {lastAlertDate} = getSettings(BARCODE_USER);

    // And then set it to now
    setSetting(BARCODE_USER, 'lastAlertDate', now.toISOString());

    // If we didn't have one to begin with, bail
    if (!lastAlertDate) {
        console.log('No last alert date');
        return;
    }

    console.log('Last alert date is', lastAlertDate);

    // Convert to Unix epoch
    const lastAlertTime = Math.floor(dateFromIsoString(lastAlertDate).getTime() / 1000);

    // Get all the alerts that are after our last alert time,
    // are mentions and are in a post
    const alerts = (await getAlerts()).filter(({action, event_date, content_type}) =>
        event_date > lastAlertTime &&
        action === 'mention' &&
        content_type === 'post');

    console.log('New mentions', alerts.length);

    for (const alert of alerts) {
        const {content_id, alert_text} = alert;
        console.log(alert_text, 'in post', content_id);
        // Get information about the post
        const post = await getPost(content_id);
        const {thread_id, user_id} = post;
        console.log('Thread', thread_id, 'user', user_id);
        // See if there is a mother associated with this thread
        const mother = getMotherForThread(thread_id);
        console.log('Mother', mother);
        // See if there is a piece of equipment associated with the thread
        const item = getItemForThread(thread_id);
        console.log('Item', item);
        // Now post with all the context without waiting
        uberPost(thread_id, 'reply-to-mention', {
            userId: user_id,
            mother, // Can be undefined
            item // Can be undefined
        });
    }
});