const { AppError, notFound } = require('../../utils/AppError');
const { isDuplicateKeyError } = require('../../utils/mongoErrors');
const { parseSort, skipFor, toPage } = require('../../utils/pagination');
const { assertRole } = require('../../utils/roles');
const { checkRepository } = require('../checks/check.repository');
const { toMyReportDetail, toMyReportListItem } = require('./report.mapper');
const { reportRepository } = require('./report.repository');

/**
 * "Report wrong verdict" on one of the user's own saved checks. The report copies the check,
 * so it survives the user deleting their history. Only one open report per check (a unique
 * partial index); a second one is a 409.
 */
async function createReport(actor, checkId, { suggestedVerdict, reason }) {
  assertRole(actor, 'user');
  const check = await checkRepository.findOwned(checkId, actor.id);
  if (!check) {
    throw notFound('Check');
  }
  if (suggestedVerdict === check.verdict) {
    const message = 'Pick a verdict different from the current one.';
    throw new AppError(400, 'VALIDATION_FAILED', 'Some fields are not valid.', [{ field: 'suggestedVerdict', message }]);
  }

  try {
    const report = await reportRepository.create({
      checkId: check._id,
      reporterId: actor.id,
      inputHash: check.inputHash,
      text: check.text,
      links: check.links,
      reasons: check.reasons,
      flags: check.flags,
      verdict: check.verdict,
      riskLevel: check.riskLevel,
      checkedAt: check.checkedAt,
      suggestedVerdict,
      reason,
      consentAt: new Date(),
    });
    return toMyReportDetail(report);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'ALREADY_REPORTED', 'This check is already waiting for a moderator.');
    }
    throw error;
  }
}

const REPORT_SORTS = ['createdAt'];

async function listMyReports(actor, query) {
  assertRole(actor, 'user');
  const sort = parseSort(query.sort, REPORT_SORTS, '-createdAt');
  const [reports, totalItems] = await Promise.all([
    reportRepository.findPageOwned(actor.id, { skip: skipFor(query), limit: query.size, sort }),
    reportRepository.countOwned(actor.id),
  ]);
  return toPage(reports.map(toMyReportListItem), totalItems, query);
}

async function getMyReport(actor, id) {
  assertRole(actor, 'user');
  const report = await reportRepository.findOwned(id, actor.id);
  if (!report) {
    throw notFound('Report');
  }
  return toMyReportDetail(report);
}

/** Opening a decided report clears its "New" tag and the dot on My reports. */
async function markSeen(actor, id) {
  assertRole(actor, 'user');
  const found = await reportRepository.markSeen(id, actor.id);
  if (!found) {
    throw notFound('Report');
  }
}

function countUnseen(userId) {
  return reportRepository.countUnseen(userId);
}

module.exports = { createReport, listMyReports, getMyReport, markSeen, countUnseen };
