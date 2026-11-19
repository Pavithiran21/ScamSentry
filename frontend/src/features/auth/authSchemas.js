import { z } from 'zod';

// The browser checks the same rules as the backend (backend/src/modules/auth/auth.schemas.js),
// with the same words (UI-UX.md "Validation messages"), so a mistake shows before the request.
// The server still checks everything again.

const EMAIL_MESSAGE = 'Enter a valid email, like name@example.com.';
const NEW_PASSWORD_MESSAGE = 'Use at least 8 characters, with a number.';

const emailField = z.string().trim().min(1, EMAIL_MESSAGE).pipe(z.email(EMAIL_MESSAGE));

// bcrypt reads only 72 bytes, so the backend refuses longer passwords rather than cutting them.
export const newPasswordField = z
  .string()
  .refine((value) => value.length >= 8 && /\d/.test(value), NEW_PASSWORD_MESSAGE)
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Use at most 72 characters.');

export const currentPasswordField = z.string().min(1, 'Enter your password.');

export const loginSchema = z.object({
  email: emailField,
  password: currentPasswordField,
});

export const signupSchema = z.object({
  email: emailField,
  password: newPasswordField,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

// "Passwords don't match." is the one rule only the browser checks (UI-UX.md).
export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords don't match.",
    path: ['confirm'],
  });

export const changePasswordSchema = z.object({
  currentPassword: currentPasswordField,
  newPassword: newPasswordField,
});

export const deleteAccountSchema = z.object({
  password: currentPasswordField,
});
