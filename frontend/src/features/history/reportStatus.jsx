import { IconCircleCheck, IconFlag, IconFlagCheck, IconHourglassEmpty } from '@tabler/icons-react';

/** The line under a History row's message: how the report on that check went (or nothing). */
export function HistoryReportLine({ status }) {
  if (status === 'open') {
    return (
      <>
        <IconFlag aria-hidden="true" /> Reported, waiting for review
      </>
    );
  }
  if (status === 'confirmed') {
    return (
      <>
        <IconFlagCheck aria-hidden="true" /> Report: verdict kept
      </>
    );
  }
  if (status === 'overturned') {
    return (
      <>
        <IconFlagCheck aria-hidden="true" /> Report: corrected
      </>
    );
  }
  return null;
}

/** My reports' Status tag: Waiting for review, Verdict kept or Corrected (with "New" when unseen). */
export function ReportStatusTag({ status, unseen = false }) {
  if (status === 'open') {
    return (
      <span className="tag t-gray">
        <IconHourglassEmpty aria-hidden="true" /> Waiting for review
      </span>
    );
  }
  const label = status === 'overturned' ? 'Corrected' : 'Verdict kept';
  if (unseen) {
    return (
      <span className="tag t-cop">
        <span className="dot bg-copper-d" aria-hidden="true" /> New · {label}
      </span>
    );
  }
  if (status === 'overturned') {
    return <span className="tag t-cop">Corrected</span>;
  }
  return (
    <span className="tag t-mod">
      <IconCircleCheck aria-hidden="true" /> Verdict kept
    </span>
  );
}
