const { test, expect } = require('@playwright/test');
const { testIp, uniqueToken } = require('../../helpers/api');

// Every page gets its own client IP (passed through the Vite proxy), so guest network limits
// of one test don't reach another.
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': testIp() });
});

async function checkMessage(page, text) {
  await page.getByLabel('Message or link').fill(text);
  await page.getByRole('form', { name: 'Check a message' }).getByRole('button', { name: 'Check message' }).click();
}

test('a guest checks a fake KYC message on the start page and sees the verdict, flags and links', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Is this message a scam?' })).toBeVisible();
  await checkMessage(page, `Your SBI KYC expires today! Update at bit.ly/kyc-${uniqueToken()} or your account is blocked.`);

  const result = page.getByRole('region', { name: 'Result' });
  await expect(result.getByText('Likely scam').first()).toBeVisible();
  await expect(result.getByText(/bit\.ly/).first()).toBeVisible();
});

test('the quota counts down, and after 3 checks the guest cannot send a fourth', async ({ page }) => {
  await page.goto('/');
  const form = page.getByRole('form', { name: 'Check a message' });
  await expect(form.getByText('3 of 3 free checks left today')).toBeVisible();
  for (let i = 0; i < 3; i += 1) {
    await checkMessage(page, `Are we meeting at 5 today? ${uniqueToken()}`);
    await expect(form.getByText(`${2 - i} of 3 free checks left today`)).toBeVisible();
  }
  await page.getByLabel('Message or link').fill(`One more question ${uniqueToken()}`);
  await expect(form.getByRole('button', { name: 'Check message' })).toBeDisabled();
});

test('the demo page logs in as the User, who has a History page', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Log in as User' }).click();
  await expect(page).not.toHaveURL(/\/demo$/);
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});

test('the demo Moderator opens the review queue; a guest is sent away from it', async ({ page }) => {
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'Review queue' })).toHaveCount(0);

  await page.goto('/demo');
  await page.getByRole('button', { name: 'Log in as Moderator' }).click();
  await expect(page).not.toHaveURL(/\/demo$/);
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeAttached();
});
