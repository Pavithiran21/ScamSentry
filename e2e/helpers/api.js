const { randomBytes, randomInt } = require('node:crypto');
const { expect } = require('@playwright/test');

// A small API client over Playwright's request context.
//
// Isolation: every test gets its own made-up client IP in X-Forwarded-For (the backend trusts the
// header only from loopback, i.e. from this run), so the guest per-network limit of one test never
// touches another's. Each test's request context has its own cookie jar, so its own guest device.
// Message texts carry a unique token, because the verdict cache is keyed on the exact text.

const MODERATORS = ['moderator@e2e.scamsentry.test', 'moderator2@e2e.scamsentry.test'];

function apiUrl(pathname) {
  return `${process.env.E2E_API_URL}${pathname}`;
}

function testIp() {
  return `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

/** A word no other test (or run) uses, to make a message text unique. */
function uniqueToken() {
  return `ref${randomBytes(5).toString('hex')}`;
}

function client(request, { token = null, ip = testIp() } = {}) {
  const headers = { 'X-Forwarded-For': ip, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const call = (method) => (pathname, data) => request.fetch(apiUrl(pathname), { method, headers, ...(data === undefined ? {} : { data }) });
  return { get: call('GET'), post: call('POST'), delete: call('DELETE'), token, ip };
}

/** The JSON body of a response that must have the given status. */
async function json(response, status) {
  const text = await response.text();
  expect(response.status(), text.slice(0, 500)).toBe(status);
  return text ? JSON.parse(text) : null;
}

/** Registers a new user and returns a signed-in client (plus email and password). */
async function newUser(request) {
  const email = `user.${uniqueToken()}@e2e.scamsentry.test`;
  const password = `Pw-${randomBytes(8).toString('hex')}-1`;
  const guest = client(request);
  const body = await json(await guest.post('/auth/register', { email, password }), 201);
  return { ...client(request, { token: body.accessToken, ip: guest.ip }), email, password };
}

async function loginAs(request, email, password) {
  const guest = client(request);
  const body = await json(await guest.post('/auth/login', { email, password }), 200);
  return client(request, { token: body.accessToken, ip: guest.ip });
}

function moderator(request, which = 0) {
  return loginAs(request, MODERATORS[which], process.env.E2E_PASSWORD);
}

/** How many times the model stub was asked about a text containing `needle`. */
async function modelCalls(request, needle) {
  const response = await request.get(`${process.env.E2E_LLM_STUB_URL}/__calls?contains=${encodeURIComponent(needle)}`);
  return (await response.json()).calls;
}

module.exports = { MODERATORS, apiUrl, testIp, uniqueToken, client, json, newUser, loginAs, moderator, modelCalls };
