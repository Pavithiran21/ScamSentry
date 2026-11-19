const { BRANDS, findBrandMentions } = require('./brands');
const { analyseLinks } = require('./links');
const { runWordRules } = require('./wordRules');

// Bumped whenever a rule changes, so saved checks show which rules produced them.
const RULES_VERSION = 1;

// Rule score thresholds (the score is the sum of the flags' weights, at most 100).
// One strong flag (an OTP request, a lookalike link) is enough for "suspicious"; two of them,
// or one strong flag with urgency and a brand name, make "likely scam".
const SUSPICIOUS_FROM = 25;
const LIKELY_SCAM_FROM = 60;
const MAX_SCORE = 100;

const LINK_FLAGS = {
  LOOKALIKE_LINK: { category: 'links', label: 'Lookalike link', weight: 40 },
  UNUSUAL_LINK: { category: 'links', label: 'Unusual link', weight: 20 },
  SHORT_LINK: { category: 'links', label: 'Short link', weight: 15 },
};
const IMPERSONATION_WEIGHT = 30;

function brandById(id) {
  return BRANDS.find((brand) => brand.id === id);
}

function linkFlagDetail(code, link) {
  if (code === 'LOOKALIKE_LINK') {
    const brand = brandById(link.brandId);
    return `Domain built to look like ${brand.name}'s real address, ${brand.official[0]}`;
  }
  if (code === 'SHORT_LINK') {
    return `${link.domain} hides where the link really goes`;
  }
  return link.unusualNote;
}

/** One flag per kind of link problem, pointing at every link that has it. */
function linkFlags(links) {
  const flags = [];
  for (const [code, info] of Object.entries(LINK_FLAGS)) {
    const affected = links.filter((link) => link.codes.includes(code));
    if (affected.length > 0) {
      flags.push({
        code,
        ...info,
        detail: linkFlagDetail(code, affected[0]),
        evidence: affected.map((link) => ({ start: link.start, end: link.end })),
      });
    }
  }
  return flags;
}

/**
 * The message names a brand, and links somewhere that is neither that brand's real domain
 * nor a short link (where we can't tell). "Says SBI, but the link isn't sbi.co.in".
 */
function impersonationFlag(text, links) {
  const readableLinks = links.filter((link) => link.domain && !link.codes.includes('SHORT_LINK'));
  for (const { brand, start, end } of findBrandMentions(text)) {
    const elsewhere = readableLinks.find((link) => !brand.official.includes(link.domain));
    if (elsewhere) {
      return {
        code: 'IMPERSONATION',
        category: 'impersonation',
        label: brand.kind === 'bank' ? 'Impersonates your bank' : `Pretends to be ${brand.name}`,
        detail: `Says ${brand.name}, but the link isn't ${brand.official[0]}`,
        weight: IMPERSONATION_WEIGHT,
        evidence: [{ start, end }],
        brandId: brand.id,
      };
    }
  }
  return null;
}

function levelFromScore(score) {
  if (score >= LIKELY_SCAM_FROM) return 'likely_scam';
  if (score >= SUSPICIOUS_FROM) return 'suspicious';
  return 'safe';
}

/**
 * The rule-based half of a check. Plain code only, so it is fast, free, and gives the same
 * answer every time. Returns
 *   { flags, links, linkCount, linksAnalysed, score, verdict, brandIds }
 * flags are in display order: wording first (as the message reads), then the link flags.
 */
function runRules(text) {
  const { links, linkCount } = analyseLinks(text);
  const flags = runWordRules(text);

  const impersonation = impersonationFlag(text, links);
  if (impersonation) {
    flags.push(impersonation);
  }
  flags.sort((a, b) => a.evidence[0].start - b.evidence[0].start);
  flags.push(...linkFlags(links));

  const score = Math.min(
    MAX_SCORE,
    flags.reduce((total, flag) => total + flag.weight, 0),
  );

  // Brands seen in the message or imitated by a link, for the advice ("Call SBI on...").
  const brandIds = [
    ...new Set([
      ...findBrandMentions(text).map((mention) => mention.brand.id),
      ...links.map((link) => link.brandId).filter(Boolean),
    ]),
  ];

  return { flags, links, linkCount, linksAnalysed: links.length, score, verdict: levelFromScore(score), brandIds };
}

module.exports = { RULES_VERSION, SUSPICIOUS_FROM, LIKELY_SCAM_FROM, runRules, brandById };
