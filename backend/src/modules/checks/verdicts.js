// The three verdicts, from least to most risky. The index + 1 is the risk level (1, 2 or 3)
// that the report's meter shows.
const VERDICTS = ['safe', 'suspicious', 'likely_scam'];

const VERDICT_LABELS = {
  safe: 'Safe',
  suspicious: 'Suspicious',
  likely_scam: 'Likely scam',
};

function riskLevel(verdict) {
  return VERDICTS.indexOf(verdict) + 1;
}

/** The riskier of two verdicts: used to combine the rules with the model. */
function stricterVerdict(first, second) {
  return riskLevel(first) >= riskLevel(second) ? first : second;
}

module.exports = { VERDICTS, VERDICT_LABELS, riskLevel, stricterVerdict };
