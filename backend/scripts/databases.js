/**
 * The database names the scripts may touch. Every script that drops or rebuilds data checks
 * the connected name against these, so none of them can ever wipe the development data.
 */
const DEV_DATABASE = 'scamsentry';
const TEST_DATABASE = 'scamsentry_test';
const DEMO_DATABASE = 'scamsentry_demo';

// drop-database.js refuses every other name.
const DROPPABLE_DATABASES = [TEST_DATABASE, DEMO_DATABASE];

module.exports = { DEV_DATABASE, TEST_DATABASE, DEMO_DATABASE, DROPPABLE_DATABASES };
