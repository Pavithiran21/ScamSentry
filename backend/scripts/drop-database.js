/**
 * Drops scamsentry_test or scamsentry_demo and confirms it is gone. Any other name is
 * refused, so this script can never drop the development database.
 * The cluster and user come from backend/.env (or ENV_FILE); the name comes from the argument.
 *
 * Usage: node scripts/drop-database.js scamsentry_demo
 */
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { withDatabaseName } = require('../src/utils/mongoUri');
const { DROPPABLE_DATABASES } = require('./databases');

async function databaseExists(name) {
  const { databases } = await mongoose.connection.db.admin().listDatabases({ nameOnly: true });
  return databases.some((database) => database.name === name);
}

async function main() {
  const name = process.argv[2];
  if (!DROPPABLE_DATABASES.includes(name)) {
    throw new Error(`drop-database only drops ${DROPPABLE_DATABASES.join(' or ')}, not "${name ?? ''}".`);
  }

  // A plain connection: no models are loaded, so nothing builds indexes in that database.
  await mongoose.connect(withDatabaseName(env.MONGODB_URI, name), { serverSelectionTimeoutMS: 10_000 });
  try {
    if (mongoose.connection.name !== name) {
      throw new Error(`Connected to "${mongoose.connection.name}", expected "${name}". Nothing dropped.`);
    }
    await mongoose.connection.dropDatabase();
    if (await databaseExists(name)) {
      throw new Error(`${name} still exists after the drop.`);
    }
    console.log(`Dropped ${name}; confirmed it no longer exists.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
