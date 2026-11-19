import { IconArrowLeft, IconClock, IconClockOff } from '@tabler/icons-react';
import { Link } from 'react-router';
import { VerdictTag } from '../../components/VerdictTag';
import { formatDate, formatShortDate } from '../../lib/dates';
import { reportRef } from '../../lib/reports';
import { ReportStatusTag } from '../history/reportStatus';

/**
 * One of my reports, read-only (design section 07): what we said, what I said, the moderator's
 * verdict and note (the moderator stays anonymous), my note, and the message copy with the date
 * it is deleted. backLink is shown on narrow screens, where the report is its own page.
 */
export function ReportView({ report, backLink = false }) {
  const ref = reportRef(report.id);
  const decided = report.status !== 'open';
  return (
    <section className="card" aria-labelledby="report-view-title">
      {backLink && (
        <Link className="crumb" to="/reports">
          <IconArrowLeft aria-hidden="true" /> My reports
        </Link>
      )}
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <h2 id="report-view-title" className="m-0">
          Report {ref}
        </h2>
        <ReportStatusTag status={report.status} />
      </div>
      <dl className="kv">
        <dt>We said</dt>
        <dd>
          <VerdictTag verdict={report.verdict} withIcon={false} />
        </dd>
        <dt>You said</dt>
        <dd>
          <VerdictTag verdict={report.suggestedVerdict} withIcon={false} />
        </dd>
        {decided && report.decision && (
          <>
            <dt>Moderator</dt>
            <dd>
              <VerdictTag verdict={report.decision.verdict} withIcon={false} /> · decided{' '}
              {formatShortDate(report.decision.decidedAt)}
            </dd>
            <dt>Their note</dt>
            <dd>{report.decision.note}</dd>
          </>
        )}
        {report.reason && (
          <>
            <dt>Your note</dt>
            <dd>{report.reason}</dd>
          </>
        )}
        <dt>Reported</dt>
        <dd>{formatShortDate(report.createdAt)}</dd>
      </dl>
      {report.textPurgedAt ? (
        <div className="purged mt-3">
          <IconClockOff aria-hidden="true" />
          <div>
            <b>Message copy deleted on {formatDate(report.textPurgedAt)}.</b> Copies are kept for 30 days after a
            decision. Your own saved check stays in History until you delete it.
          </div>
        </div>
      ) : (
        <>
          {report.text && <div className="msg">{report.text}</div>}
          <p className="hint">
            <IconClock className="inline align-[-2px]" aria-hidden="true" />{' '}
            {decided && report.purgeAt
              ? `The moderator's copy of this message is deleted on ${formatDate(report.purgeAt)}. Your own saved check stays in History.`
              : "A moderator will review it. The moderator's copy is deleted 30 days after the review."}
          </p>
        </>
      )}
    </section>
  );
}

/** The page notice when a result arrives and the report is opened for the first time. */
export function NewResultNotice({ report }) {
  const ref = reportRef(report.id);
  const verdict = <VerdictTag verdict={report.decision?.verdict ?? report.verdict} withIcon={false} />;
  return (
    <div className="notice info mb-4.5" role="status">
      <IconClock aria-hidden="true" />
      <div>
        <b>A moderator reviewed your report {ref}.</b>{' '}
        {report.status === 'overturned' ? (
          <>
            They corrected the verdict to {verdict}. Checking that message again now shows the corrected verdict.
          </>
        ) : (
          <>They kept the verdict {verdict}.</>
        )}
      </div>
    </div>
  );
}
