import { IconCircleCheck, IconCpu, IconInfoCircle, IconUserShield } from '@tabler/icons-react';
import { useId } from 'react';
import { formatDateTime } from '../../lib/dates';
import { FlagIcon } from '../../components/FlagIcon';
import { flagDetail } from '../../lib/flags';
import { linkSummary } from '../../lib/linkStatus';
import { verdictInfo } from '../../lib/verdicts';
import { HighlightedMessage } from './HighlightedMessage';
import { LinkCard } from './LinkCard';

function redFlagCount(count) {
  if (count === 0) {
    return 'no red flags';
  }
  return `${count} red ${count === 1 ? 'flag' : 'flags'}`;
}

/**
 * The security report (design section 03), from the check in POST /checks or GET /checks/:id:
 * a coloured header with the seal, the verdict, the risk line, the 1-2-3 meter and the source
 * chip; then the red flags with the message and its highlights, "Why we think so", the links
 * and "What to do now"; then the standing "not a guarantee" line and the footer the page passes.
 *
 * headingRef receives the verdict heading, so a new report can take focus (UI-UX "Announcements").
 */
export function SecurityReport({ check, headingRef, footer }) {
  const headingId = useId();
  const { label, risk, Icon } = verdictInfo(check.verdict);
  const corrected = check.source === 'moderator';
  const flags = check.flags ?? [];
  const links = check.links ?? [];
  const reasons = check.reasons ?? [];
  const advice = check.advice ?? [];

  const reasonsBlock = reasons.length > 0 && (
    <>
      <h2 className={corrected ? undefined : 'next'}>Why we think so</h2>
      <ul className="why">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </>
  );

  return (
    <article className={`report v-${check.verdict}`} aria-labelledby={headingId}>
      <div className="rep-head">
        <div className="seal" aria-hidden="true">
          <Icon />
        </div>
        <div>
          <div className="eyebrow">Security report · {formatDateTime(check.checkedAt)}</div>
          <h2 className="verdict" id={headingId} ref={headingRef} tabIndex={-1}>
            {label}
          </h2>
          <div>
            Risk: {risk} · {redFlagCount(flags.length)} · {linkSummary(links)}
          </div>
          <div className="meter" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <span key={step} className={step <= check.riskLevel ? 'on' : undefined} />
            ))}
          </div>
          {corrected && (
            <div className="mt-3">
              <span className="tag chip-w">
                <IconUserShield aria-hidden="true" /> Corrected by a moderator
              </span>
            </div>
          )}
        </div>
        {!corrected && (
          <span className="tag chip-w">
            <IconCpu aria-hidden="true" /> Rules + AI check
          </span>
        )}
      </div>

      <div className="rep-body">
        <div>
          {corrected && reasonsBlock}
          <h2 className={corrected ? 'next' : undefined}>Red flags we found</h2>
          {flags.length === 0 ? (
            <div className="none">
              <IconCircleCheck aria-hidden="true" />
              <div>
                <b>No red flags found</b>
                <div>We checked the wording and every link.</div>
              </div>
            </div>
          ) : (
            <div>
              {flags.map((flag, index) => (
                <FlagRow key={`${flag.code}-${index}`} flag={flag} text={check.text} />
              ))}
            </div>
          )}
          {check.text && (
            <HighlightedMessage text={check.text} flags={flags} links={links} verdict={check.verdict} />
          )}
          {!corrected && reasonsBlock}
        </div>
        <div>
          {links.length > 0 && (
            <>
              <h2>{links.length === 1 ? 'The link' : 'The links'}</h2>
              {links.map((link, index) => (
                <LinkCard key={`${link.start}-${index}`} link={link} />
              ))}
              {check.linkCount > check.linksAnalysed && (
                <p className="hint">
                  We checked the first {check.linksAnalysed} of {check.linkCount} links.
                </p>
              )}
            </>
          )}
          <h2 className={links.length > 0 ? 'next' : undefined}>What to do now</h2>
          <ol className="steps">
            {advice.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <p className="disclaimer">
        <IconInfoCircle aria-hidden="true" /> An automated check, not a guarantee. When in doubt, don&apos;t reply.
      </p>
      {footer && <div className="rep-foot">{footer}</div>}
    </article>
  );
}

function FlagRow({ flag, text }) {
  const detail = flagDetail(flag, text);
  return (
    <div className="flag">
      <span className="ic" aria-hidden="true">
        <FlagIcon code={flag.code} />
      </span>
      <div>
        <b>{flag.label}</b>
        {detail && <div className="muted">{detail}</div>}
      </div>
    </div>
  );
}
