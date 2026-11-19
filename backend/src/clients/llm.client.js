const { setTimeout: sleep } = require('node:timers/promises');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

const RETRY_DELAY_MS = 1000;
// The longest wait a 429's Retry-After may ask for before the one retry. Groq's free tier
// limits tokens per minute, so a busy minute often frees up within a few seconds.
const MAX_RETRY_WAIT_MS = 10_000;
// The model's whole answer. A reasoning model (gpt-oss) also spends these on its thinking,
// which is why LLM_REASONING_EFFORT=low is set for it.
const MAX_ANSWER_TOKENS = 1200;

/** The model didn't give an answer: timeout, network error, error status, empty or cut-off reply. */
class LlmUnavailableError extends Error {
  constructor(reason) {
    super(`LLM unavailable: ${reason}`);
    this.name = 'LlmUnavailableError';
  }
}

function isWorthRetrying(status) {
  // Too many requests and server errors can pass; a 400 or 401 will fail the same way again.
  return status === 429 || status >= 500;
}

function retryWaitMs(response) {
  if (response?.status === 429) {
    const seconds = Number(response.headers.get('retry-after'));
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_WAIT_MS);
    }
  }
  return RETRY_DELAY_MS;
}

async function replyText(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new LlmUnavailableError('reply is not JSON');
  }
  const choice = body?.choices?.[0];
  const content = choice?.message?.content;
  if (choice?.finish_reason === 'length') {
    // Cut off at MAX_ANSWER_TOKENS: even if what's left still parses, it is half an answer,
    // and it must never be cached and reused for this message.
    throw new LlmUnavailableError('reply was cut off at the token limit');
  }
  if (typeof content !== 'string' || content.trim() === '') {
    throw new LlmUnavailableError('reply is empty');
  }
  return content;
}

/**
 * Sends one chat request to the OpenAI-compatible API in LLM_BASE_URL (Groq, or the local stub e2e/mocks/llm-stub.js in
 * tests and demos) and returns the model's reply text, which should be a JSON object.
 * Every call has a timeout and one retry after a short pause for a timeout, a network error,
 * a 429 or a 5xx. The prompt and the reply hold message text, so neither is ever logged.
 */
async function chatJson(systemPrompt, userPrompt) {
  const url = `${env.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (env.LLM_API_KEY) {
    headers.Authorization = `Bearer ${env.LLM_API_KEY}`;
  }
  const body = {
    model: env.LLM_MODEL,
    // 0: the most likely answer every time, as repeatable as the model allows.
    temperature: 0,
    max_tokens: MAX_ANSWER_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  if (env.LLM_REASONING_EFFORT) {
    body.reasoning_effort = env.LLM_REASONING_EFFORT;
  }

  let lastReason = 'no attempt';
  for (const attempt of [1, 2]) {
    let response = null;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(env.LLM_TIMEOUT_MS),
      });
    } catch (error) {
      lastReason = error.name === 'TimeoutError' ? 'timeout' : 'network error';
      logger.warn({ attempt, reason: lastReason }, 'LLM request failed');
    }

    if (response?.ok) {
      return replyText(response);
    }
    if (response) {
      lastReason = `status ${response.status}`;
      logger.warn({ attempt, status: response.status }, 'LLM answered with an error status');
      if (!isWorthRetrying(response.status)) {
        break;
      }
    }
    if (attempt === 1) {
      await sleep(retryWaitMs(response));
    }
  }
  throw new LlmUnavailableError(lastReason);
}

module.exports = { chatJson, LlmUnavailableError };
