const { createHmac } = require('node:crypto');
const { env } = require('../../config/env');
const { LlmUnavailableError } = require('../../clients/llm.client');
const { AppError, notFound } = require('../../utils/AppError');
const { parseSort, skipFor, toPage } = require('../../utils/pagination');
const { assertRole } = require('../../utils/roles');
const quotaService = require('../quota/quota.service');
const { reportRepository } = require('../reports/report.repository');
const { userRepository } = require('../users/user.repository');
const { buildAdvice } = require('./advice');
const { toCheckListItem, toCheckResponse } = require('./check.mapper');
const { checkRepository } = require('./check.repository');
const { assessWithModel, MODEL_KEY } = require('./llmAssessment');
const { RULES_VERSION, runRules } = require('./rules');
const { cleanAndValidate } = require('./sanitize');
const { verdictCacheRepository } = require('./verdictCache.repository');
const { riskLevel, stricterVerdict } = require('./verdicts');

const CORRECTED_REASON = 'A moderator reviewed this exact message after a report and set this verdict.';

/**
 * The cache key for a message: an HMAC of the cleaned text with a server secret. The same
 * text always gives the same key, but someone with the database alone can't test guesses
 * of what a guest's message said.
 */
function hashInput(text) {
  return createHmac('sha256', env.INPUT_HASH_SECRET).update(text).digest('hex');
}

/**
 * The hybrid check on cleaned text: rules, then the verdict cache, then (only on a cache
 * miss) the model. The final verdict is the stricter of the rules and the model, so text that
 * talks the model into "safe" can't lower what the rules found. A moderator's correction for
 * this exact text replaces both.
 */
async function assess(text) {
  const rules = runRules(text);
  const inputHash = hashInput(text);
  const cached = await verdictCacheRepository.findByHash(inputHash);

  let verdict;
  let reasons;
  let source;
  let modelVerdict = null;

  if (cached?.source === 'moderator') {
    verdict = cached.verdict;
    reasons = [CORRECTED_REASON];
    source = 'moderator';
  } else {
    let model;
    if (cached && cached.modelKey === MODEL_KEY) {
      model = { verdict: cached.verdict, reasons: cached.reasons };
      source = 'cache';
    } else {
      model = await assessWithModel(text, rules.flags);
      await verdictCacheRepository.saveModelAnswer({ inputHash, ...model, modelKey: MODEL_KEY });
      source = 'rules+ai';
    }
    verdict = stricterVerdict(rules.verdict, model.verdict);
    reasons = model.reasons;
    modelVerdict = model.verdict;
  }

  return {
    inputHash,
    verdict,
    riskLevel: riskLevel(verdict),
    ruleVerdict: rules.verdict,
    ruleScore: rules.score,
    modelVerdict,
    source,
    rulesVersion: RULES_VERSION,
    text,
    flags: rules.flags.map(({ weight: _weight, brandId: _brandId, ...flag }) => flag),
    links: rules.links.map(({ unusualNote: _unusualNote, ...link }) => link),
    linkCount: rules.linkCount,
    linksAnalysed: rules.linksAnalysed,
    reasons,
    advice: buildAdvice({ verdict, text, flags: rules.flags, links: rules.links, brandIds: rules.brandIds }),
    checkedAt: new Date(),
  };
}

/** What is stored: everything for a user; for a guest only the hash, the verdict and the flag codes. */
function toStoredCheck(result, actor) {
  const common = {
    inputHash: result.inputHash,
    verdict: result.verdict,
    riskLevel: result.riskLevel,
    ruleVerdict: result.ruleVerdict,
    ruleScore: result.ruleScore,
    modelVerdict: result.modelVerdict,
    source: result.source,
    rulesVersion: result.rulesVersion,
    linkCount: result.linkCount,
    linksAnalysed: result.linksAnalysed,
    checkedAt: result.checkedAt,
  };
  if (!actor) {
    return { ...common, userId: null, flags: result.flags.map((flag) => ({ code: flag.code, category: flag.category })) };
  }
  return {
    ...common,
    userId: actor.id,
    flags: result.flags,
    text: result.text,
    links: result.links,
    reasons: result.reasons,
    advice: result.advice,
  };
}

/**
 * POST /checks. caller: { actor, deviceId, ipAddress } (see quota/deviceCookie.js).
 * Order matters: the text is validated before any quota is used, the quota is reserved
 * before the model is called, and given back if the model can't answer.
 * Returns { check, quota }.
 */
async function checkMessage(caller, rawText) {
  if (caller.actor?.role === 'moderator') {
    throw new AppError(403, 'FORBIDDEN', 'Moderators review reports; log out to check a message as a guest.');
  }
  const text = cleanAndValidate(rawText);

  // The access token is a signed claim that lives for 15 minutes, so it can outlive a deleted
  // account. Saving a check for a user who is gone would leave their message text behind, so
  // a signed-in check first makes sure the account still exists.
  if (caller.actor && !(await userRepository.existsById(caller.actor.id))) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
  }

  const reservation = await quotaService.reserveCheck(caller);
  let result;
  try {
    result = await assess(text);
  } catch (error) {
    await quotaService.releaseCheck(reservation);
    if (error instanceof LlmUnavailableError) {
      throw new AppError(
        503,
        'CHECKER_UNAVAILABLE',
        "Couldn't check right now. This didn't use up a free check; try again in a minute.",
      );
    }
    throw error;
  }

  const saved = await checkRepository.create(toStoredCheck(result, caller.actor));
  const id = caller.actor ? String(saved._id) : null;
  const quota = await quotaService.getQuota(caller);
  return { check: toCheckResponse(result, { id }), quota };
}

const HISTORY_SORTS = ['checkedAt'];

async function listHistory(actor, query) {
  assertRole(actor, 'user');
  const sort = parseSort(query.sort, HISTORY_SORTS, '-checkedAt');
  const [checks, totalItems] = await Promise.all([
    checkRepository.findPageOwned(actor.id, { skip: skipFor(query), limit: query.size, sort }),
    checkRepository.countOwned(actor.id),
  ]);
  const statuses = await reportRepository.latestStatusByCheckIds(checks.map((check) => check._id));
  const items = checks.map((check) => toCheckListItem(check, statuses[String(check._id)] ?? null));
  return toPage(items, totalItems, query);
}

function reportSummary(report) {
  if (!report) {
    return null;
  }
  return {
    id: String(report._id),
    status: report.status,
    createdAt: report.createdAt,
    decidedAt: report.decision?.decidedAt ?? null,
  };
}

async function getCheck(actor, id) {
  assertRole(actor, 'user');
  const check = await checkRepository.findOwned(id, actor.id);
  if (!check) {
    throw notFound('Check');
  }
  const report = await reportRepository.findLatestForCheck(check._id);
  return toCheckResponse(check, { id: String(check._id), report: reportSummary(report) });
}

async function deleteCheck(actor, id) {
  assertRole(actor, 'user');
  const deleted = await checkRepository.deleteOwned(id, actor.id);
  if (deleted === 0) {
    throw notFound('Check');
  }
}

/** Deletes the whole history. Reports keep their own copy until they are reviewed. Returns { deleted }. */
async function deleteHistory(actor) {
  assertRole(actor, 'user');
  return { deleted: await checkRepository.deleteAllOwned(actor.id) };
}

module.exports = { hashInput, checkMessage, listHistory, getCheck, deleteCheck, deleteHistory };
