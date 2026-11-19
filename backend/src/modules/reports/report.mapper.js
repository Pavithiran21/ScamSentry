const { preview, toFlagResponse, toLinkResponse } = require('../checks/check.mapper');

function decidedAt(report) {
  return report.decision?.decidedAt ?? null;
}

/** "Waiting for review", "Verdict kept" or "Corrected" comes from status; unseen drives the "New" tag. */
function toMyReportListItem(report) {
  return {
    id: String(report._id),
    checkId: String(report.checkId),
    preview: preview(report.text),
    verdict: report.verdict,
    suggestedVerdict: report.suggestedVerdict,
    status: report.status,
    unseen: report.status !== 'open' && !report.reporterSeen,
    createdAt: report.createdAt,
    decidedAt: decidedAt(report),
  };
}

function messageCopy(report) {
  return {
    text: report.text ?? null,
    flags: (report.flags ?? []).map(toFlagResponse),
    links: (report.links ?? []).map(toLinkResponse),
    reasons: report.reasons ?? [],
    textPurgedAt: report.textPurgedAt,
    purgeAt: report.purgeAt,
  };
}

/** The reporter's read-only view. The moderator stays anonymous: only the verdict and the note. */
function toMyReportDetail(report) {
  return {
    ...toMyReportListItem(report),
    riskLevel: report.riskLevel,
    checkedAt: report.checkedAt,
    reason: report.reason,
    decision: report.decision
      ? { action: report.decision.action, verdict: report.decision.verdict, note: report.decision.note, decidedAt: decidedAt(report) }
      : null,
    ...messageCopy(report),
  };
}

/** A review-queue row: never who reported it. */
function toQueueItem(report) {
  return {
    id: String(report._id),
    preview: preview(report.text),
    verdict: report.verdict,
    suggestedVerdict: report.suggestedVerdict,
    status: report.status,
    createdAt: report.createdAt,
    decidedAt: decidedAt(report),
    textPurged: Boolean(report.textPurgedAt),
  };
}

/** The moderator's detail pane. moderatorId is turned into "was it me", never shown as an id. */
function toQueueDetail(report, actor) {
  return {
    ...toQueueItem(report),
    riskLevel: report.riskLevel,
    checkedAt: report.checkedAt,
    reason: report.reason,
    decision: report.decision
      ? {
          action: report.decision.action,
          verdict: report.decision.verdict,
          note: report.decision.note,
          decidedAt: decidedAt(report),
          decidedByMe: String(report.decision.moderatorId) === String(actor.id),
        }
      : null,
    ...messageCopy(report),
  };
}

module.exports = { toMyReportListItem, toMyReportDetail, toQueueItem, toQueueDetail };
