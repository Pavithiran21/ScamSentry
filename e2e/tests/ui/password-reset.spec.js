const { test, expect } = require('@playwright/test');
const { newUser, testIp } = require('../../helpers/api');
const { waitForMail } = require('../../helpers/mail');

// The whole reset flow, with the real email read from the run's Ethereal inbox.
test('forgot password: the emailed link sets a new password that then logs in', async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': testIp() });
  const user = await newUser(request);

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();

  const mail = await waitForMail({ to: user.email, subject: /Reset your ScamSentry password/ });
  const link = mail.html.match(/href="([^"]*\/reset-password\?token=[^"]+)"/)?.[1];
  expect(link, 'reset link in the email').toBeTruthy();
  const { pathname, search } = new URL(link.replace(/&amp;/g, '&'));
  await page.goto(pathname + search);

  const newPassword = 'Fresh-password-42';
  await page.getByRole('textbox', { name: 'New password' }).fill(newPassword);
  await page.getByRole('textbox', { name: 'Confirm password' }).fill(newPassword);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('button', { name: 'Save new password' })).toHaveCount(0);

  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(newPassword);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});
