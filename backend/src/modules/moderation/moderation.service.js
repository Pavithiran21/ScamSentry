const mongoose = require('mongoose');
const { AppError, notFound } = require('../../utils/AppError');
const { parseSort, skipFor, toPage } = require('../../utils/pagination');
const { assertRole } = require('../../utils/roles');
const { verdictCacheRepository } = require('../checks/verdictCache.repository');
const { VERDICT_LABELS } = require('../checks/verdicts');
const { toQueueDetail, toQueueItem } = require('../reports/report.mapper');
const { reportRepository } = require('../reports/report.repository');

// The message copy in a report is deleted this long after the decision (PROJECTS.md).
const PURGE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function alreadyDecided() {
  return new AppError(409, 'ALREADY_DECIDED', 'Another moderator has already decided this report.');
}

async function getSummary(actor) {
  assertRole(actor, 'moderator');
  return reportRepository.summary();
}

const QUEUE_SORTS = ['createdAt'];

/** One tab of the queue. Oldest first by default, so nothing waits forever. */
async function listQueue(actor, { status, ...query }) {
  assertRole(actor, 'moderator');
  const sort = parseSort(query.sort, QUEUE_SORTS, 'createdAt');
  const [reports, totalItems] = await Promise.all([
    reportRepository.findPageByStatus(status, { skip: skipFor(query), limit: query.size, sort }),
    reportRepository.countByStatus(status),
  ]);
  return toPage(reports.map(toQueueItem), totalItems, query);
}

async function getReport(actor, id) {
  assertRole(actor, 'moderator');
  const report = await reportRepository.findById(id);
  if (!report) {
    throw notFound('Report');
  }
  return toQueueDetail(report, actor);
}

/** Confirm must keep the original verdict; overturn must change it (422 otherwise). */
function decisionVerdict(report, { action, verdict }) {
  if (action === 'confirm') {
    const kept = verdict ?? report.verdict;
    if (kept !== report.verdict) {
      throw new AppError(422, 'DECISION_MISMATCH', 'To keep the original verdict, confirm it; to change it, overturn it.');
    }
    return kept;
  }
  if (verdict === report.verdict) {
    throw new AppError(
      422,
      'DECISION_MISMATCH',
      `The verdict is already ${VERDICT_LABELS[verdict]}. Confirm it, or pick a different one to overturn.`,
    );
  }
  return verdict;
}

/**
 * Records a moderator's decision, once.
 *   - The report's status changes only if it is still 'open', in one atomic update: if two
 *     moderators decide at the same moment, one wins and the other gets 409.
 *   - An overturn also writes the corrected verdict into the verdict cache for this message's
 *     hash, so every later check of the same text gets it. Both writes run in one MongoDB
 *     transaction: either the report is decided and the cache corrected, or neither.
 *   - The original check in the user's history is never edited.
 */
async function decide(actor, id, input) {
  assertRole(actor, 'moderator');
  const report = await reportRepository.findById(id);
  if (!report) {
    throw notFound('Report');
  }
  if (report.status !== 'open') {
    throw alreadyDecided();
  }

  const verdict = decisionVerdict(report, input);
  const decidedAt = new Date();
  const changes = {
    status: input.action === 'confirm' ? 'confirmed' : 'overturned',
    decision: { action: input.action, verdict, note: input.note, moderatorId: actor.id, decidedAt },
    purgeAt: new Date(decidedAt.getTime() + PURGE_AFTER_DAYS * DAY_MS),
    reporterSeen: false,
  };

  // connection.transaction() starts a session, runs the function in a transaction, commits,
  // and retries on MongoDB's transient transaction errors. Throwing inside aborts it.
  const decided = await mongoose.connection.transaction(async (session) => {
    const updated = await reportRepository.decideIfOpen(id, changes, session);
    if (!updated) {
      throw alreadyDecided();
    }
    if (input.action === 'overturn') {
      await verdictCacheRepository.saveCorrection(
        { inputHash: report.inputHash, verdict, reportId: report._id, correctedAt: decidedAt },
        session,
      );
    }
    return updated;
  });

  return toQueueDetail(decided, actor);
}

module.exports = { PURGE_AFTER_DAYS, getSummary, listQueue, getReport, decide };
