const { test, expect } = require('@playwright/test');
const { apiUrl, client, json, moderator, newUser, uniqueToken } = require('../../helpers/api');

async function reportedCheck(request, { text } = {}) {
  const user = await newUser(request);
  const messageText = text ?? `Hey, are we still meeting for lunch on Friday? ${uniqueToken()}`;
  const { check } = await json(await user.post('/checks', { text: messageText }), 201);
  const report = await json(await user.post(`/checks/${check.id}/reports`, { suggestedVerdict: 'likely_scam', reason: 'This number has been sending fake job offers.', consent: true }), 201);
  return { user, check, report, text: messageText };
}

test('a report needs consent to share the message, and a verdict different from the current one', async ({ request }) => {
  const user = await newUser(request);
  const { check } = await json(await user.post('/checks', { text: `See you at the station at 6. ${uniqueToken()}` }), 201);
  expect((await user.post(`/checks/${check.id}/reports`, { suggestedVerdict: 'likely_scam' })).status()).toBe(400);
  expect((await user.post(`/checks/${check.id}/reports`, { suggestedVerdict: 'safe', consent: true })).status()).toBe(400);
});

test('report -> moderator overturns -> the same text now gets the corrected verdict, and the reporter is told', async ({ request }) => {
  const { user, check, report, text } = await reportedCheck(request);
  expect(check.verdict).toBe('safe');

  const mod = await moderator(request);
  await json(await mod.post(`/moderation/reports/${report.id}/decision`, { action: 'overturn', verdict: 'likely_scam', note: 'Known job-offer scam pattern.' }), 200);

  const again = (await json(await client(request).post('/checks', { text }), 200)).check;
  expect(again).toMatchObject({ verdict: 'likely_scam', source: 'moderator' });

  const mine = await json(await user.get(`/reports/${report.id}`), 200);
  expect(mine.status).toBe('overturned');
  // The original history entry is never edited.
  expect((await json(await user.get(`/checks/${check.id}`), 200)).verdict).toBe('safe');
});

test('two moderators deciding one report at once: one wins, the other gets 409', async ({ request }) => {
  const { report } = await reportedCheck(request);
  const [first, second] = await Promise.all([moderator(request, 0), moderator(request, 1)]);
  const responses = await Promise.all([
    first.post(`/moderation/reports/${report.id}/decision`, { action: 'confirm', note: 'Looks fine.' }),
    second.post(`/moderation/reports/${report.id}/decision`, { action: 'overturn', verdict: 'suspicious', note: 'Unsure.' }),
  ]);
  expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
});

test('the daily purge removes a decided report\'s message copy after 30 days, and needs the job secret', async ({ request }) => {
  const { report } = await reportedCheck(request);
  const mod = await moderator(request);
  await json(await mod.post(`/moderation/reports/${report.id}/decision`, { action: 'confirm', note: 'Ordinary message.' }), 200);

  const in31Days = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
  expect((await request.post(apiUrl('/internal/jobs/purge-report-text'), { data: { now: in31Days } })).status()).toBe(401);
  const run = await json(await request.post(apiUrl('/internal/jobs/purge-report-text'), { data: { now: in31Days }, headers: { 'X-Job-Secret': process.env.JOB_TRIGGER_SECRET } }), 200);
  expect(run.purged).toBeGreaterThanOrEqual(1);
  expect((await json(await mod.get(`/moderation/reports/${report.id}`), 200)).textPurged).toBe(true);
});

test('a user cannot open the review queue (403); another user\'s check answers 404', async ({ request }) => {
  const { check } = await reportedCheck(request);
  const stranger = await newUser(request);
  expect((await stranger.get('/moderation/reports')).status()).toBe(403);
  expect((await stranger.get(`/checks/${check.id}`)).status()).toBe(404);
  expect((await stranger.delete(`/checks/${check.id}`)).status()).toBe(404);
});

test('history: a user deletes one check, then all of them', async ({ request }) => {
  const user = await newUser(request);
  const ids = [];
  for (let i = 0; i < 3; i += 1) ids.push((await json(await user.post('/checks', { text: `Note ${i} ${uniqueToken()}` }), 201)).check.id);

  expect((await user.delete(`/checks/${ids[0]}`)).status()).toBe(204);
  expect((await user.get(`/checks/${ids[0]}`)).status()).toBe(404);
  await json(await user.delete('/checks'), 200);
  const page = await json(await user.get('/checks'), 200);
  expect(page.items ?? page.data).toHaveLength(0);
});

test('log in: wrong password and unknown email get the same 401; no token is 401', async ({ request }) => {
  const user = await newUser(request);
  const guest = client(request);
  const wrong = await guest.post('/auth/login', { email: user.email, password: 'Not-the-password-1' });
  const unknown = await guest.post('/auth/login', { email: `nobody.${uniqueToken()}@e2e.scamsentry.test`, password: 'Not-the-password-1' });
  expect(wrong.status()).toBe(401);
  expect(unknown.status()).toBe(401);
  expect((await wrong.json()).error.message).toBe((await unknown.json()).error.message);
  expect((await guest.get('/checks')).status()).toBe(401);
});
