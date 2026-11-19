import { verdictInfo } from '../lib/verdicts';

/** "Likely scam" as a coloured pill with its icon (the word is always there, not only the colour). */
export function VerdictTag({ verdict, withIcon = true }) {
  const { label, tag, Icon } = verdictInfo(verdict);
  return (
    <span className={`tag ${tag}`}>
      {withIcon && <Icon aria-hidden="true" />}
      {label}
    </span>
  );
}
