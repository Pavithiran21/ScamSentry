// Small, readable helpers for reasoning about domain names.

// Two-part public suffixes that come up in Indian and global messages. With these,
// "sbi.co.in" is registered as "sbi.co.in" (not "co.in"). A full Public Suffix List would be
// more complete; this short list covers the cases the rules need and is easy to explain.
const MULTI_PART_SUFFIXES = new Set([
  'co.in', 'net.in', 'org.in', 'gov.in', 'nic.in', 'ac.in', 'edu.in', 'res.in', 'firm.in', 'gen.in', 'ind.in', 'bank.in',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'co.nz', 'com.sg', 'com.my', 'co.za', 'com.br', 'co.jp',
]);

// Top-level domains seen far more in scams than in real services (free or very cheap
// to register, little checking).
const RISKY_TLDS = new Set([
  'xyz', 'top', 'click', 'link', 'live', 'online', 'site', 'icu', 'buzz', 'rest', 'cfd', 'sbs', 'zip', 'mov', 'loan', 'work', 'support', 'help', 'win', 'bid',
]);

// Services whose only job is to hide a long address behind a short one.
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'ow.ly', 'shorturl.at', 'tiny.cc', 'rebrand.ly', 'bl.ink', 'short.gy', 'shorte.st', 'v.gd', 'bitly.ws', 'qr.ae', 'tinu.be', 's.id', 't.ly',
]);

const IPV4_HOST = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function isIpAddress(host) {
  return IPV4_HOST.test(host) || host.startsWith('[');
}

/** "login.sbi-kyc-update.co" -> "sbi-kyc-update.co"; "sbi.co.in" -> "sbi.co.in"; an IP stays itself. */
function registrableDomain(host) {
  if (isIpAddress(host)) {
    return host;
  }
  const labels = host.split('.');
  if (labels.length <= 2) {
    return host;
  }
  const lastTwo = labels.slice(-2).join('.');
  const size = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-size).join('.');
}

/** The part of a registered domain before its suffix: "sbi-kyc-update.co" -> "sbi-kyc-update". */
function domainName(domain) {
  const labels = domain.split('.');
  const lastTwo = labels.slice(-2).join('.');
  const suffixSize = MULTI_PART_SUFFIXES.has(lastTwo) ? 2 : 1;
  return labels.slice(0, Math.max(1, labels.length - suffixSize)).join('.');
}

function topLevelDomain(host) {
  return host.split('.').pop();
}

/**
 * Folds the characters scammers swap in to imitate a name: digits that look like letters,
 * "rn" for "m" and "vv" for "w". "paypa1" and "hdfcbαnk" (after punycode is ruled out) both
 * fold to their brand.
 */
function foldLookalikes(value) {
  return value
    .toLowerCase()
    .replaceAll('rn', 'm')
    .replaceAll('vv', 'w')
    .replaceAll('0', 'o')
    .replaceAll('1', 'l')
    .replaceAll('3', 'e')
    .replaceAll('5', 's')
    .replaceAll('7', 't');
}

/** Classic Levenshtein distance: the number of single-letter edits from one word to the other. */
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

module.exports = {
  RISKY_TLDS,
  URL_SHORTENERS,
  isIpAddress,
  registrableDomain,
  domainName,
  topLevelDomain,
  foldLookalikes,
  editDistance,
};
