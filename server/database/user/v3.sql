-------------------------------------------------------------------------------

BEGIN;

-------------------------------------------------------------------------------

PRAGMA user_version = 3;

-------------------------------------------------------------------------------
-- Supporting members
-------------------------------------------------------------------------------
-- This is a table that we create from data we get from the XenForo database
-- tables xf_user_upgrade_active and xf_user_upgrade_expired which track
-- supporting member 'upgrades'
-- We keep all members that are currently active and for how many days.
-- We also keep the expired period that ended within the last year, to
-- see how many days they were active during that time.
-- Brand new supporting members will not have an expired period.

CREATE TABLE supportingMembers (
    userId              INTEGER PRIMARY KEY,
    activeStartDate     TEXT NOT NULL,
    activeEndDate       TEXT NOT NULL,
    activeDays          INTEGER NOT NULL,
    expiredStartDate    TEXT,
    expiredEndDate      TEXT,
    expiredDays         INTEGER
);

-------------------------------------------------------------------------------

COMMIT;