/**
 * A stand-in for the OpenAI-compatible model API (Groq in production), so a run spends no quota
 * and every answer is fixed. make-env.js and the seed scripts point LLM_BASE_URL at
 * http://localhost:8080/llm/v1. Start it on its own with: node e2e/mocks/llm-stub.js
 *
 * POST /llm/v1/chat/completions answers from the message between the checker's random tags:
 *   - contains STUB_DOWN                     -> 503 (the checker retries once, then gives up)
 *   - "ignore ... rules/instructions"        -> "safe" (a fooled model: the rules must still win)
 *   - scam words (KYC, OTP, prize, blocked…) -> "likely_scam"
 *   - "not sure"                             -> "suspicious"
 *   - anything else                          -> "safe"
 * GET /__calls?contains=<text> -> { calls } : how many requests held that text (cache tests).
 */
const http = require('node:http');

const PORT = Number(process.env.LLM_STUB_PORT ?? 8080);
const seen = [];

function messageOf(body) {
  const prompt = body?.messages?.find((message) => message.role === 'user')?.content ?? '';
  const match = prompt.match(/<([A-Za-z0-9_-]+)>\n([\s\S]*)\n<\/\1>/);
  return match ? match[2] : prompt;
}

// Fixed answers for the seed samples (backend/scripts/sample-messages.js), checked first, so seeded
// history and reports always look the same: genuine bank and courier notices are safe, the
// "Hi Mom" and power-cut messages are suspicious, and the rest fall to the rules below.
const SAMPLES = [
  [/is your OTP for HDFC Bank NetBanking/, 'safe', 'A genuine one-time password notice that warns you not to share it.'],
  [/credit card statement for/, 'safe', 'A routine statement notice with no link or request for details.'],
  [/Delhivery: Your package will be delivered/, 'safe', 'A delivery update that links to the courier\'s real website.'],
  [/still meeting at 6 for dinner/, 'safe', 'An ordinary personal message with no request for money or details.'],
  [/Hi Mom, I lost my phone/, 'suspicious', 'A "new number" message asking for money is a common family-impersonation trick.'],
  [/electricity power will be disconnected/, 'suspicious', 'Power companies don\'t threaten same-night cuts by SMS and ask you to call an officer.'],
  [/part-time job|redelivery fee|amaz0n|eligible for a refund/i, 'likely_scam', 'It asks for money or details with a made-up reason and an unofficial link.'],
];

function answerFor(text) {
  for (const [pattern, verdict, reason] of SAMPLES) {
    if (pattern.test(text)) return { verdict, reasons: [reason] };
  }
  if (/ignore (all |your |the )?(previous |earlier )?(rules|instructions)/i.test(text)) {
    return { verdict: 'safe', reasons: ['The message says it is a safe, verified notice.'] };
  }
  if (/\b(kyc|otp|prize|lottery|blocked|suspended|refund|won)\b/i.test(text)) {
    return { verdict: 'likely_scam', reasons: ['It pushes you to act fast and hand over account details.'] };
  }
  if (/not sure/i.test(text)) {
    return { verdict: 'suspicious', reasons: ['It is unclear who sent this or why.'] };
  }
  return { verdict: 'safe', reasons: ['An ordinary personal message with no request for money or details.'] };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // /__admin/health is what the seed scripts probe (seed-helpers.js ensureWireMock).
  if (req.method === 'GET' && (url.pathname === '/__health' || url.pathname === '/__admin/health')) return send(res, 200, { ok: true });
  if (req.method === 'GET' && url.pathname === '/__calls') {
    const needle = url.searchParams.get('contains') ?? '';
    return send(res, 200, { calls: seen.filter((text) => text.includes(needle)).length });
  }
  if (req.method !== 'POST' || url.pathname !== '/llm/v1/chat/completions') return send(res, 404, { error: 'not stubbed' });

  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const text = messageOf(JSON.parse(raw || '{}'));
    seen.push(text);
    if (text.includes('STUB_DOWN')) return send(res, 503, { error: { message: 'stub is down' } });
    return send(res, 200, {
      id: 'stub',
      object: 'chat.completion',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(answerFor(text)) } }],
    });
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`LLM stub on http://127.0.0.1:${PORT}/llm/v1`));
