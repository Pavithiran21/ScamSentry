import { IconArrowLeft, IconArrowRight, IconArrowsExchange, IconCircleCheck, IconClock, IconClockOff, IconUsers } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { decideReport, getQueueReport } from '../../api/moderation';
import { queryKeys } from '../../api/queryKeys';
import { ErrorPanel, SkeletonPanel } from '../../components/StatePanels';
import { VerdictTag } from '../../components/VerdictTag';
import { isNotFound } from '../../lib/apiErrors';
import { formatAgeWords, formatDate } from '../../lib/dates';
import { reportRef } from '../../lib/reports';
import { verdictInfo } from '../../lib/verdicts';
import { NotFoundPanel } from '../../pages/NotFoundPage';
import { useToast } from '../../toast/ToastContext';
import { HighlightedMessage } from '../report/HighlightedMessage';
import { DecisionForm } from './DecisionForm';

/**
 * The open report in the moderator workspace: the message copy with its highlights, our verdict
 * and signals, the user's verdict and note, then the decision form (open) or the decision (decided).
 * The reporter is never shown: the API sends no reporter id or email.
 *
 * Two moderators deciding at once: the second gets 409 ALREADY_DECIDED. The pane then reloads
 * the report, shows the saved decision with "Another moderator has already decided this report."
 * and offers Next report.
 */
export function ReportPane({ reportId, onNext, backTo }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [lostRaceFor, setLostRaceFor] = useState(null);
  const query = useQuery({ queryKey: queryKeys.modReport(reportId), queryFn: () => getQueueReport(reportId) });

  const decision = useMutation({
    mutationFn: (input) => decideReport(reportId, input),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.modReport(reportId), saved);
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation });
      const overturned = saved.status === 'overturned';
      showToast(overturned ? 'Verdict overturned' : 'Verdict confirmed', {
        icon: overturned ? IconArrowsExchange : IconCircleCheck,
        action: { label: 'Next report', onClick: onNext },
      });
    },
    onError: (error) => {
      if (error.code === 'ALREADY_DECIDED') {
        setLostRaceFor(reportId);
        queryClient.invalidateQueries({ queryKey: queryKeys.moderation });
      }
    },
  });

  const backLink = backTo && (
    <Link className="crumb" to={backTo}>
      <IconArrowLeft aria-hidden="true" /> Review queue
    </Link>
  );

  if (query.isPending) {
    return (
      <section className="mdetail" aria-label="Loading the report">
        {backLink}
        <SkeletonPanel label="Loading the report" rows={6} />
      </section>
    );
  }
  if (query.isError) {
    return (
      <section className="mdetail" aria-label="Report">
        {backLink}
        {isNotFound(query.error) ? <NotFoundPanel /> : <ErrorPanel error={query.error} onRetry={() => query.refetch()} />}
      </section>
    );
  }

  const report = query.data;
  const ref = reportRef(report.id);
  const lostRace = lostRaceFor === report.id;

  return (
    <section className="mdetail" aria-labelledby="mod-report-title">
      {backLink}
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 id="mod-report-title">{ref}</h2>
        <StatusTag report={report} />
      </div>

      {lostRace && (
        <div className="notice info" role="alert">
          <IconUsers aria-hidden="true" />
          <div>
            <b>Another moderator has already decided this report.</b> Their decision is below; yours wasn&apos;t saved.
          </div>
        </div>
      )}

      {report.textPurged ? (
        <div className="purged">
          <IconClockOff aria-hidden="true" />
          <div>
            <b>Message copy deleted on {formatDate(report.textPurgedAt)}.</b> Copies are kept for 30 days after a
            decision. The verdicts and notes below stay.
          </div>
        </div>
      ) : (
        report.text && (
          <HighlightedMessage text={report.text} flags={report.flags} links={report.links} verdict={report.verdict} />
        )
      )}

      <dl className="kv">
        <dt>We said</dt>
        <dd>
          <VerdictTag verdict={report.verdict} withIcon={false} />
        </dd>
        {report.flags?.length > 0 && (
          <>
            <dt>Signals</dt>
            <dd className="flex flex-wrap gap-1.5">
              {report.flags.map((flag, index) => (
                <span key={`${flag.code}-${index}`} className={`tag ${verdictInfo(report.verdict).tag}`}>
                  {flag.label}
                </span>
              ))}
            </dd>
          </>
        )}
        <dt>User says</dt>
        <dd>
          <VerdictTag verdict={report.suggestedVerdict} withIcon={false} />
        </dd>
        {report.reason && (
          <>
            <dt>User&apos;s note</dt>
            <dd className="muted">“{report.reason}”</dd>
          </>
        )}
        {report.decision && <DecisionRows decision={report.decision} original={report.verdict} />}
      </dl>

      {report.status === 'open' ? (
        <DecisionForm
          key={report.id}
          report={report}
          saving={decision.isPending}
          error={decision.error}
          onDecide={(input) => decision.mutate(input)}
        />
      ) : (
        (lostRace || decision.isSuccess) && (
          <div className="dec-row">
            <button type="button" className="btn btn-char" onClick={onNext}>
              Next report <IconArrowRight aria-hidden="true" />
            </button>
          </div>
        )
      )}
    </section>
  );
}

function StatusTag({ report }) {
  if (report.status === 'open') {
    return (
      <span className="tag t-gray">
        <IconClock aria-hidden="true" /> Open · {formatAgeWords(report.createdAt)}
      </span>
    );
  }
  if (report.status === 'overturned') {
    return (
      <span className="tag t-cop">
        <IconArrowsExchange aria-hidden="true" /> Overturned
      </span>
    );
  }
  return (
    <span className="tag t-mod">
      <IconCircleCheck aria-hidden="true" /> Confirmed
    </span>
  );
}

function DecisionRows({ decision, original }) {
  const kept = decision.action === 'confirm';
  return (
    <>
      <dt>Decision</dt>
      <dd>
        <VerdictTag verdict={decision.verdict ?? original} withIcon={false} /> {kept ? 'kept' : ''} ·{' '}
        {formatDate(decision.decidedAt)}
      </dd>
      <dt>Decided by</dt>
      <dd>{decision.decidedByMe ? 'You' : 'Another moderator'}</dd>
      <dt>{decision.decidedByMe ? 'Your note' : 'Their note'}</dt>
      <dd className="muted">“{decision.note}”</dd>
    </>
  );
}
