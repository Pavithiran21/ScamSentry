const { findOfficialBrand, BRANDS } = require('./brands');
const {
  RISKY_TLDS,
  URL_SHORTENERS,
  domainName,
  editDistance,
  foldLookalikes,
  isIpAddress,
  registrableDomain,
  topLevelDomain,
} = require('./domains');

// At most this many links are analysed per message; the rest are only counted.
const MAX_LINKS_ANALYSED = 10;

// Top-level domains a bare address (no "http://" or "www.") must end in to count as a link.
// Without the list, "Mr.Smith" or "v1.2" would be read as links.
const BARE_TLDS = [
  'com', 'in', 'co', 'net', 'org', 'info', 'io', 'me', 'ly', 'app', 'xyz', 'top', 'click', 'link', 'live', 'online', 'site', 'shop',
  'store', 'icu', 'buzz', 'gov', 'edu', 'uk', 'us', 'biz', 'cc', 'tk', 'ml', 'ga', 'cf', 'gq', 'bank', 'to', 'it', 'gy', 'at', 'gl',
  'ws', 'id', 'ae', 'be', 'ai', 'dev', 'support', 'help', 'win', 'loan', 'work', 'sbi', 'cfd', 'sbs', 'rest', 'zip', 'mov', 'bid',
];

const CHARACTERS_IN_A_LINK = String.raw`[^\s<>"'\x60]`;
const LINK_PATTERN = new RegExp(
  [
    // http:// or https:// followed by anything up to a space
    String.raw`\bhttps?:\/\/${CHARACTERS_IN_A_LINK}+`,
    // www.something
    String.raw`(?<![\w@.-])www\.${CHARACTERS_IN_A_LINK}+`,
    // a bare domain such as sbi-kyc-update.co or bit.ly/3xYz9k (not the end of an email address)
    String.raw`(?<![\w@./-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:${BARE_TLDS.join('|')})(?![a-z0-9-])(?:[/?#]${CHARACTERS_IN_A_LINK}*)?`,
  ].join('|'),
  'giu',
);

// A sentence often ends right after a link: "...at bit.ly/abc." The dot is not part of it.
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"*]+$/u;

/** Every link in the text, in order: [{ text, start, end }]. */
function extractLinks(text) {
  const links = [];
  LINK_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const linkText = match[0].replace(TRAILING_PUNCTUATION, '');
    if (linkText.length > 0) {
      links.push({ text: linkText, start: match.index, end: match.index + linkText.length });
    }
  }
  return links;
}

/** Does the host carry a brand's name, exactly or with a letter or two changed? */
function imitatesBrand(host, brand) {
  const tokens = host.split(/[.-]/).filter(Boolean).map(foldLookalikes);
  const joined = foldLookalikes(domainName(registrableDomain(host)).replaceAll('-', ''));

  return brand.keywords.some((keyword) => {
    if (tokens.includes(keyword)) {
      return true;
    }
    // Short keywords ("sbi", "pnb") must match a whole part exactly, or every word would match.
    if (keyword.length < 5) {
      return false;
    }
    const allowedEdits = keyword.length >= 7 ? 2 : 1;
    const nearMiss = tokens.some(
      (token) => Math.abs(token.length - keyword.length) <= allowedEdits && editDistance(token, keyword) <= allowedEdits,
    );
    return nearMiss || joined.includes(keyword);
  });
}

function highlightDomainName(linkText, domain) {
  const name = isIpAddress(domain) ? domain : domainName(domain);
  const index = linkText.toLowerCase().indexOf(name);
  return index >= 0 ? { start: index, end: index + name.length } : null;
}

/**
 * What one link really is. Returns
 *   { text, start, end, host, domain, status, notes, highlight, codes, brandId, unusualNote }
 * status: 'risky' (lookalike or unusual address), 'cant_verify' (a short link hides the
 * destination), 'official' (a known brand's real domain) or 'no_issues'.
 * notes: plain-language lines for "The link" panel. highlight: the fake part of the link
 * text (offsets inside text), or null. codes: the flags this link raises.
 */
function analyseLink(found) {
  const result = {
    ...found,
    host: null,
    domain: null,
    status: 'no_issues',
    notes: [],
    highlight: null,
    codes: [],
    brandId: null,
    // The first "unusual address" reason, used as the Unusual link flag's detail.
    unusualNote: null,
  };
  const addUnusual = (note) => {
    result.codes.push('UNUSUAL_LINK');
    result.notes.push(note);
    result.unusualNote ??= note;
  };

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(found.text) ? found.text : `http://${found.text}`);
  } catch {
    result.status = 'risky';
    addUnusual("We couldn't read this address");
    return result;
  }

  // The WHATWG URL parser lowercases the host and turns letters from other alphabets into
  // punycode ("xn--..."), so the checks below see what the browser would really open.
  const host = url.hostname.replace(/\.$/, '');
  const domain = registrableDomain(host);
  result.host = host;
  result.domain = domain;

  const officialBrand = findOfficialBrand(domain);
  if (URL_SHORTENERS.has(domain) || URL_SHORTENERS.has(host)) {
    result.codes.push('SHORT_LINK');
    result.notes.push('Shortened link · the real destination is hidden');
  }

  const lookalikeOf = officialBrand ? null : BRANDS.find((brand) => imitatesBrand(host, brand));
  if (lookalikeOf) {
    result.codes.push('LOOKALIKE_LINK');
    result.brandId = lookalikeOf.id;
    result.notes.push(`Pretends to be ${lookalikeOf.official[0]}`, 'different registered domain');
  }

  if (url.username || url.password) {
    addUnusual('Has an "@" trick: browsers ignore everything before it');
  }
  if (isIpAddress(host)) {
    addUnusual('Uses a number address instead of a name');
  }
  if (host.split('.').some((label) => label.startsWith('xn--'))) {
    addUnusual('Uses lookalike letters from another alphabet');
  }
  const tld = topLevelDomain(host);
  if (RISKY_TLDS.has(tld) && !isIpAddress(host)) {
    addUnusual(`Ends in .${tld}, common in scam links`);
  }
  // Only when the message really wrote "http://"; a bare "bit.ly/abc" says nothing about it.
  if (/^http:\/\//i.test(found.text) && result.codes.length > 0) {
    result.notes.push('plain http');
  }

  result.codes = [...new Set(result.codes)];
  if (result.codes.includes('LOOKALIKE_LINK') || result.codes.includes('UNUSUAL_LINK')) {
    result.status = 'risky';
    result.highlight = highlightDomainName(found.text, domain);
  } else if (result.codes.includes('SHORT_LINK')) {
    result.status = 'cant_verify';
  } else if (officialBrand) {
    result.status = 'official';
    result.brandId = officialBrand.id;
    result.notes.push(`The real address of ${officialBrand.name}`);
  }
  return result;
}

/** Returns { links: the first MAX_LINKS_ANALYSED analysed, linkCount: how many links there are in all }. */
function analyseLinks(text) {
  const found = extractLinks(text);
  return {
    links: found.slice(0, MAX_LINKS_ANALYSED).map(analyseLink),
    linkCount: found.length,
  };
}

module.exports = { MAX_LINKS_ANALYSED, extractLinks, analyseLinks, imitatesBrand };
