import { IconAlertOctagon, IconAlertTriangle, IconShieldCheck } from '@tabler/icons-react';

// The three verdicts, from least to most risky, as the API sends them. Each always has a word,
// an icon and a colour (UI-UX.md "Verdict scale"), so colour is never the only signal.
export const VERDICTS = ['safe', 'suspicious', 'likely_scam'];

const VERDICT_INFO = {
  safe: { label: 'Safe', risk: 'low', tag: 't-safe', Icon: IconShieldCheck },
  suspicious: { label: 'Suspicious', risk: 'medium', tag: 't-sus', Icon: IconAlertTriangle },
  likely_scam: { label: 'Likely scam', risk: 'high', tag: 't-scam', Icon: IconAlertOctagon },
};

export function verdictInfo(verdict) {
  return VERDICT_INFO[verdict] ?? VERDICT_INFO.suspicious;
}

export function verdictLabel(verdict) {
  return verdictInfo(verdict).label;
}
