// The wording rules. Each rule is a list of patterns (case-insensitive) for one red flag.
//   code:      stable id, saved with the check and used by the frontend for the icon
//   category:  urgency, impersonation, credentials, money or manipulation
//   weight:    how much the flag adds to the rule score (see rules/index.js for the thresholds)
//   negatable: skip a match right after "do not", "never"... so "Do not share this OTP"
//              (a real bank's warning) is not read as "share this OTP"

// Words that ask someone to hand something over, followed by up to four words.
const ASK = String.raw`\b(?:share|send|tell|forward|give|provide|enter|reply with|submit|confirm|type)\b(?:\W+\w+){0,4}?\W+`;
const MONEY = String.raw`(?:₹|rs\.?|inr)\s?\d[\d,]*(?:\.\d+)?`;

const WORD_RULES = [
  {
    code: 'URGENCY',
    category: 'urgency',
    label: 'Urgency',
    weight: 15,
    patterns: [
      String.raw`\burgent(?:ly)?\b`,
      String.raw`\bimmediately\b`,
      String.raw`\bright away\b`,
      String.raw`\bact now\b`,
      String.raw`\b(?:last|final) (?:chance|warning|reminder|notice)\b`,
      String.raw`\bwill be (?:blocked|suspended|deactivated|disabled|closed|terminated|disconnected|cancelled|frozen)(?: today| tonight| shortly| soon)?\b`,
      String.raw`\b(?:kyc|pan|account|card|sim)(?: (?:is|has been|was))? (?:expired|pending|suspended|blocked|deactivated|on hold)\b`,
    ],
  },
  {
    code: 'DEADLINE',
    category: 'urgency',
    label: 'Deadline',
    weight: 10,
    patterns: [
      String.raw`\bwithin (?:\d+|one|two|twenty[- ]four) ?(?:minutes?|mins?|hours?|hrs?|days?)\b`,
      String.raw`\bby (?:today|tonight|midnight)\b`,
      String.raw`\bbefore (?:midnight|tonight|\d{1,2} ?(?:am|pm))\b`,
      String.raw`\btoday itself\b`,
      String.raw`\bor (?:it|your \w+) will be (?:returned|cancelled|blocked|disconnected|deleted)\b`,
    ],
  },
  {
    code: 'OTP_REQUEST',
    category: 'credentials',
    label: 'Asks for your OTP',
    weight: 35,
    negatable: true,
    patterns: [`${ASK}(?:otp|one[- ]time password|verification code|security code|6[- ]digit code)\\b`],
  },
  {
    code: 'CARD_DETAILS_REQUEST',
    category: 'credentials',
    label: 'Asks for your card details or PIN',
    weight: 35,
    negatable: true,
    patterns: [`${ASK}(?:cvv|card number|card details|atm pin|upi pin|pin|expiry date)\\b`],
  },
  {
    code: 'PASSWORD_REQUEST',
    category: 'credentials',
    label: 'Asks for your password',
    weight: 30,
    negatable: true,
    patterns: [`${ASK}(?:password|net ?banking (?:id|login|details)|login details)\\b`],
  },
  {
    code: 'MONEY_REQUEST',
    category: 'money',
    label: 'Asks for money',
    weight: 20,
    negatable: true,
    patterns: [
      String.raw`\bpay(?:ment of)?\s*${MONEY}`,
      String.raw`${MONEY}\s*(?:\w+\s){0,2}(?:fee|charges?|fine|penalty|deposit)\b`,
      String.raw`\b(?:processing|registration|redelivery|re-delivery|delivery|customs|clearance|activation|verification) (?:fee|charges?)\b`,
      String.raw`\bgift cards?\b`,
      String.raw`\bupi collect\b`,
      String.raw`\bsend (?:me |us )?money\b`,
    ],
  },
  {
    code: 'PRIZE_OFFER',
    category: 'money',
    label: 'Prize or reward offer',
    weight: 20,
    patterns: [
      String.raw`\byou(?:'ve| have)? won\b`,
      String.raw`\b(?:lottery|lucky draw|jackpot|prize money)\b`,
      String.raw`\bclaim (?:your |the )?(?:prize|reward|gift|cashback)\b`,
      String.raw`\bfree (?:gift|recharge|iphone|laptop)\b`,
    ],
  },
  {
    code: 'JOB_OFFER',
    category: 'money',
    label: 'Easy-money job offer',
    weight: 20,
    patterns: [
      String.raw`\bwork from home\b`,
      String.raw`\bpart[- ]time (?:job|work|role)\b`,
      String.raw`\bearn (?:up to )?${MONEY}\s?(?:per|a|every|daily)\b`,
      String.raw`\bdaily (?:income|earnings?|payouts?)\b`,
      String.raw`\blik(?:e|ing) (?:youtube )?videos\b`,
    ],
  },
  {
    code: 'PROMPT_INJECTION',
    category: 'manipulation',
    label: 'Tries to trick automated checks',
    detail: 'Contains instructions aimed at a checker like this one, which real messages never do',
    weight: 35,
    patterns: [
      String.raw`\bignore (?:all |any |the )?(?:previous|prior|above|earlier|your|these) (?:instructions?|rules|prompts?)\b`,
      String.raw`\b(?:disregard|forget) (?:all |your |the |any )?(?:previous |prior |earlier )?(?:instructions|rules)\b`,
      String.raw`\byou are now\b`,
      String.raw`\bsystem prompt\b`,
      String.raw`\bnew instructions\b`,
      String.raw`\b(?:mark|classify|label|rate|report) (?:this|the) (?:message |text )?as (?:safe|legit(?:imate)?|genuine|not (?:a )?scam)\b`,
      String.raw`\b(?:respond|answer|reply|output) (?:only )?with\W{0,3}(?:verdict|safe)\b`,
    ],
  },
];

for (const rule of WORD_RULES) {
  rule.regexes = rule.patterns.map((pattern) => new RegExp(pattern, 'giu'));
}

const NEGATION_BEFORE = /\b(?:do not|don't|dont|never|not|no one|nobody|won't|will not)\b[^.!?\n]{0,15}$/i;
const MAX_EVIDENCE_PER_FLAG = 5;

/** [{ start, end }] of every match of a rule, earliest first, without overlaps. */
function findEvidence(text, rule) {
  const spans = [];
  for (const regex of rule.regexes) {
    for (const match of text.matchAll(regex)) {
      const start = match.index;
      const before = text.slice(Math.max(0, start - 25), start);
      if (rule.negatable && NEGATION_BEFORE.test(before)) {
        continue;
      }
      spans.push({ start, end: start + match[0].length });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && span.start < last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push(span);
    }
  }
  return merged.slice(0, MAX_EVIDENCE_PER_FLAG);
}

/** The money request's label depends on the amount: a small fee is the classic parcel scam. */
function moneyLabel(text, evidence) {
  for (const span of evidence) {
    const amount = /(?:₹|rs\.?|inr)\s?(\d[\d,]*)/iu.exec(text.slice(span.start, span.end));
    if (amount) {
      return Number(amount[1].replaceAll(',', '')) <= 100 ? 'Small payment request' : 'Asks for money';
    }
  }
  return 'Asks for money';
}

/** The wording flags found in the text: [{ code, category, label, detail, weight, evidence }]. */
function runWordRules(text) {
  const flags = [];
  for (const rule of WORD_RULES) {
    const evidence = findEvidence(text, rule);
    if (evidence.length === 0) {
      continue;
    }
    flags.push({
      code: rule.code,
      category: rule.category,
      label: rule.code === 'MONEY_REQUEST' ? moneyLabel(text, evidence) : rule.label,
      detail: rule.detail ?? null,
      weight: rule.weight,
      evidence,
    });
  }
  return flags;
}

module.exports = { WORD_RULES, runWordRules };
