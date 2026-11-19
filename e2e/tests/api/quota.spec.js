const { test, expect, request: playwrightRequest } = require('@playwright/test');
const { client, json, moderator, newUser, testIp, uniqueToken } = require('../../helpers/api');

const message = () => `Hello, is the meeting still on at 4? ${uniqueToken()}`;

test('a guest device gets 3 checks a day; the 4th is 429 with Retry-After', async ({ request }) => {
  const guest = client(request);
  for (let i = 0; i < 3; i += 1) await json(await guest.post('/checks', { text: message() }), 200);

  const refused = await guest.post('/checks', { text: message() });
  expect(refused.status()).toBe(429);
  expect((await refused.json()).error.code).toBe('DEVICE_LIMIT_REACHED');
  expect(Number(refused.headers()['retry-after'])).toBeGreaterThan(0);
});

test('one network gets 10 guest checks a day across devices; the 11th device is refused', async () => {
  const ip = testIp();
  const contexts = [];
  try {
    for (let device = 0; device < 11; device += 1) contexts.push(await playwrightRequest.newContext());
    // Ten devices (each its own cookie jar, so its own ss_device cookie) use one check each.
    for (const context of contexts.slice(0, 10)) await json(await client(context, { ip }).post('/checks', { text: message() }), 200);

    const eleventh = await client(contexts[10], { ip }).post('/checks', { text: message() });
    expect(eleventh.status()).toBe(429);
    expect((await eleventh.json()).error.code).toBe('NETWORK_LIMIT_REACHED');
  } finally {
    await Promise.all(contexts.map((context) => context.dispose()));
  }
});

test('simultaneous guest checks never go over the device limit', async ({ request }) => {
  const guest = client(request);
  // The first call sets the device cookie; the rest race for the 2 checks left.
  await json(await guest.post('/checks', { text: message() }), 200);
  const statuses = (await Promise.all(Array.from({ length: 6 }, () => guest.post('/checks', { text: message() })))).map((r) => r.status());
  expect(statuses.filter((status) => status === 200)).toHaveLength(2);
  expect(statuses.filter((status) => status === 429)).toHaveLength(4);
});

test('a signed-in user gets 30 a day and their checks are saved (201)', async ({ request }) => {
  const user = await newUser(request);
  const { check, quota } = await json(await user.post('/checks', { text: message() }), 201);
  expect(check.id).toBeTruthy();
  expect(quota.user).toMatchObject({ limit: 30, used: 1, remaining: 29 });
});

test('a moderator cannot run checks (403)', async ({ request }) => {
  const mod = await moderator(request);
  expect((await mod.post('/checks', { text: message() })).status()).toBe(403);
});
