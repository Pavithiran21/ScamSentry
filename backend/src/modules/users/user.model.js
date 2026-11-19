const { Schema, model } = require('mongoose');
const { ROLES } = require('../auth/tokens');

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Public sign-up always makes 'user'; 'moderator' is set only by scripts/seed-moderator.js.
    role: { type: String, enum: ROLES, required: true, default: 'user' },
    // Demo accounts cannot change their password or be deleted.
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const UserModel = model('User', userSchema);

module.exports = { UserModel };
