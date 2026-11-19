/**
 * Creates a Moderator, the only way one can exist: public sign-up always makes a 'user'.
 * If the email already has an account, it is made a moderator (and its password set, when
 * one is given). The password is read from the MODERATOR_PASSWORD environment variable so it
 * never appears in the shell history or in a file.
 *
 * Usage (PowerShell, from backend/):
 *   $env:MODERATOR_PASSWORD='...'; npm run seed:moderator -- --email moderator@example.com; Remove-Item Env:MODERATOR_PASSWORD
 */
const bcrypt = require('bcryptjs');
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { emailField, newPasswordField } = require('../src/modules/auth/auth.schemas');
const { BCRYPT_ROUNDS } = require('../src/modules/auth/auth.service');
const { UserModel } = require('../src/modules/users/user.model');

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = emailField.parse(argument('email') ?? '');
  const rawPassword = process.env.MODERATOR_PASSWORD;

  await connectDb();
  try {
    const existing = await UserModel.findOne({ email });
    if (!existing && !rawPassword) {
      throw new Error('Set MODERATOR_PASSWORD for a new moderator (at least 8 characters, with a number).');
    }

    const changes = { role: 'moderator' };
    if (rawPassword) {
      changes.passwordHash = await bcrypt.hash(newPasswordField.parse(rawPassword), BCRYPT_ROUNDS);
    }

    if (existing) {
      await UserModel.updateOne({ _id: existing._id }, { $set: changes });
      console.log(`${email} is now a moderator${rawPassword ? ' (password set)' : ''}.`);
    } else {
      await UserModel.create({ email, ...changes });
      console.log(`Created moderator ${email}.`);
    }
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.issues ? error.issues.map((issue) => issue.message).join(' ') : error.message);
  process.exitCode = 1;
});
