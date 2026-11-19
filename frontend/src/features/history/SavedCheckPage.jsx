import { IconArrowLeft, IconFlag, IconHourglassEmpty, IconRadar2, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCheck } from '../../api/checks';
import { queryKeys } from '../../api/queryKeys';
import { ErrorPanel } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isNotFound } from '../../lib/apiErrors';
import { formatDateTime } from '../../lib/dates';
import { NotFoundPanel } from '../../pages/NotFoundPage';
import { SecurityReport } from '../report/SecurityReport';
import { DeleteCheckDialog } from './DeleteDialogs';
import { ReportDialog } from './ReportDialog';

/**
 * /history/:id, a saved check, read-only (there is no edit form). Another user's check, or one
 * that was deleted, is a 404 from the API and shows "We can't find that page".
 */
export function SavedCheckPage() {
  usePageTitle('Saved check');
  const { id } = useParams();
  const [dialog, setDialog] = useState(null); // 'report' | 'delete' | null
  const query = useQuery({ queryKey: queryKeys.check(id), queryFn: () => getCheck(id) });
  const check = query.data;

  return (
    <main className="main top" id="main">
      <Link className="crumb" to="/history">
        <IconArrowLeft aria-hidden="true" /> History
      </Link>
      {query.isPending && <ReportSkeleton />}
      {query.isError && (isNotFound(query.error) ? <NotFoundPanel /> : <ErrorPanel error={query.error} onRetry={() => query.refetch()} />)}
      {check && (
        <>
          <div className="page-head">
            <h1>Saved check</h1>
            <span className="muted pb-1">Checked {formatDateTime(check.checkedAt)}</span>
          </div>
          <SecurityReport
            check={check}
            footer={<SavedCheckFooter check={check} onReport={() => setDialog('report')} onDelete={() => setDialog('delete')} />}
          />
          <ReportDialog open={dialog === 'report'} check={check} onClose={() => setDialog(null)} />
          <DeleteCheckDialog open={dialog === 'delete'} checkId={check.id} onClose={() => setDialog(null)} />
        </>
      )}
    </main>
  );
}

/**
 * The saved check's footer. One open report per check is the API's rule (409 ALREADY_REPORTED),
 * so while one is open the Report button is replaced by "Reported · waiting for review".
 */
function SavedCheckFooter({ check, onReport, onDelete }) {
  const openReport = check.report?.status === 'open' ? check.report : null;
  return (
    <>
      {openReport ? (
        <>
          <span className="tag t-gray">
            <IconHourglassEmpty aria-hidden="true" /> Reported · waiting for review
          </span>
          <Link className="link-c" to={`/reports/${openReport.id}`}>
            Open in My reports
          </Link>
        </>
      ) : (
        <button type="button" className="btn btn-line" onClick={onReport}>
          <IconFlag aria-hidden="true" /> Report wrong verdict
        </button>
      )}
      <button type="button" className="btn btn-line btn-danger-line" onClick={onDelete}>
        <IconTrash aria-hidden="true" /> Delete this check
      </button>
      <Link className="btn btn-copper spacer" to="/">
        <IconRadar2 aria-hidden="true" /> Check another
      </Link>
    </>
  );
}

function ReportSkeleton() {
  return (
    <div className="report" role="status">
      <span className="sr">Loading the saved check</span>
      <div className="p-6">
        <div className="skel w-2/5" />
        <div className="skel w-3/5" />
        <div className="skel" />
        <div className="skel" />
        <div className="skel w-1/3" />
      </div>
    </div>
  );
}
