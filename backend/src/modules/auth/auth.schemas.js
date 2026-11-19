const { z } = require('zod');

// Field rules shared by auth and profile. Messages match UI-UX.md.

const emailField = z
  .string('Enter a valid email, like name@example.com.')
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email, like name@example.com.'));

// bcrypt only uses the first 72 bytes of a password, so longer ones are refused
// rather than silently cut.
const newPasswordField = z
  .string('Use at least 8 characters, with a number.')
  .refine((value) => value.length >= 8 && /\d/.test(value), 'Use at least 8 characters, with a number.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Use at most 72 characters.');

// Existing passwords are only checked against the hash, never against the rules above.
const currentPasswordField = z.string('Enter your password.').min(1, 'Enter your password.').max(200);

const registerSchema = z.object({
  email: emailField,
  password: newPasswordField,
});

const loginSchema = z.object({
  email: emailField,
  password: currentPasswordField,
});

const forgotPasswordSchema = z.object({
  email: emailField,
});

const resetPasswordSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'This link has expired or was already used.'),
  password: newPasswordField,
});

module.exports = {
  emailField,
  newPasswordField,
  currentPasswordField,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
