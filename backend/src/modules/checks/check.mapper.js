const PREVIEW_LENGTH = 120;

function preview(text) {
  if (!text) {
    return null;
  }
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : oneLine;
}

function toFlagResponse(flag) {
  return {
    code: flag.code,
    category: flag.category,
    label: flag.label ?? null,
    detail: flag.detail ?? null,
    evidence: flag.evidence ?? [],
  };
}

function toLinkResponse(link) {
  return {
    text: link.text,
    start: link.start,
    end: link.end,
    host: link.host ?? null,
    domain: link.domain ?? null,
    status: link.status,
    notes: link.notes ?? [],
    highlight: link.highlight ?? null,
  };
}

/** The domain History shows under the message: the first risky link, else the first link. */
function primaryDomain(links = []) {
  const risky = links.find((link) => link.status === 'risky' && link.domain);
  return risky?.domain ?? links.find((link) => link.domain)?.domain ?? null;
}

/**
 * The security report. For a guest the check is not saved, so id is null and the report is
 * built from the result in memory. text is the cleaned text the evidence offsets point into.
 */
function toCheckResponse(check, { id = null, report = null } = {}) {
  return {
    id,
    verdict: check.verdict,
    riskLevel: check.riskLevel,
    source: check.source,
    text: check.text,
    flags: check.flags.map(toFlagResponse),
    links: check.links.map(toLinkResponse),
    linkCount: check.linkCount,
    linksAnalysed: check.linksAnalysed,
    reasons: check.reasons,
    advice: check.advice,
    checkedAt: check.checkedAt,
    report,
  };
}

/** One History row. reportStatus: the newest report on this check, or null. */
function toCheckListItem(check, reportStatus = null) {
  return {
    id: String(check._id),
    preview: preview(check.text),
    primaryDomain: primaryDomain(check.links),
    verdict: check.verdict,
    riskLevel: check.riskLevel,
    flagCount: check.flags.length,
    linkCount: check.linkCount,
    checkedAt: check.checkedAt,
    reportStatus,
  };
}

module.exports = { preview, toFlagResponse, toLinkResponse, toCheckResponse, toCheckListItem };
