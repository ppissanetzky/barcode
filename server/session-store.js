const { ca } = require('date-fns/locale');
const ms = require('ms');
const debug = require('debug')('barcode:session-store');

const {database} = require('./user-database');

//-----------------------------------------------------------------------------

const SESSION_EXPIRES_AFTER = '1 day';

const SESSION_CLEANUP_INTERVAL = '1 day';

//-----------------------------------------------------------------------------

function wrap(callback, f) {
    try {
        const result = f();
        callback && callback(null, result);
    } catch (error) {
        debug(error);
        callback && callback(error);
    }
}

module.exports = function(Session) {

    const {Store} = Session;

    class SessionStore extends Store {

        constructor() {
            super();
            this.db = database.connect();
            this.deleteExpiredSessions();
            setInterval(() => this.deleteExpiredSessions(),
                ms(SESSION_CLEANUP_INTERVAL)).unref();
        }

        deleteExpiredSessions() {
            debug('Deleting expired sessions');
            const count = this.db.change(
                'DELETE FROM sessions WHERE $now > expires',
                {now: new Date().getTime()}
            );
            debug('Deleted', count);
        }

        get(id, callback) {
            wrap(callback, () => {
                debug('Getting', id);
                const row = this.db.first(
                    'SELECT session FROM sessions WHERE id = $id AND $now <= expires',
                    {id, now: new Date().getTime()}
                );
                if (!row) {
                    debug('Session', id, 'not found');
                    return;
                }
                const session = JSON.parse(row.session);
                debug('Session', id, ':', session);
                return session;
            });
        }

        set(id, session, callback) {
            wrap(callback, () => {
                debug('Setting', id, 'to', session);
                const maxAge = session.cookie.maxAge;
                const now = new Date().getTime();
                const expires = maxAge ? now + maxAge : now + ms(SESSION_EXPIRES_AFTER);
                const changed = this.db.change(
                    `
                    INSERT OR REPLACE INTO sessions (id, expires, session)
                    VALUES ($id, $expires, $session)
                    `,
                    {id, expires, session: JSON.stringify(session)}
                );
                debug('Set', id, changed);
            });
        }

        destroy(id, callback) {
            wrap(callback, () => {
                debug('Destroying', id);
                const deleted = this.db.change(
                    'DELETE FROM sessions WHERE id = $id',
                    {id}
                );
                debug('Destroyed', id, deleted);
            });
        }

        length(callback) {
            wrap(callback, () => {
                debug('Length');
                const {count} = this.db.first('SELECT COUNT(id) AS count FROM sessions');
                return count;
            });
        }

        clear(callback) {
            wrap(callback, () => {
                debug('Clear');
                const changed = this.db.change('DELETE FROM sessions');
                debug('Deleted', changed);
            });
        }

        all(callback) {
            wrap(callback, () => {
                debug('All');
                const rows = this.db.all('SELECT session FROM sessions');
                return rows.map(({session}) => JSON.parse(session));
            });
        }
    }

    return SessionStore;
}
