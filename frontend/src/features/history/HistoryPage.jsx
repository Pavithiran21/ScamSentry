import { IconChevronRight, IconHistory, IconTrash } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { listChecks } from '../../api/checks';
import { queryKeys } from '../../api/queryKeys';
import { Pager } from '../../components/Pager';
import { EmptyState, ErrorPanel, SkeletonPanel } from '../../components/StatePanels';
import { VerdictTag } from '../../components/VerdictTag';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatShortDateTime } from '../../lib/dates';
import { DeleteHistoryDialog } from './DeleteDialogs';
import { HistoryReportLine } from './reportStatus';

export const HISTORY_PAGE_SIZE = 10;

function pageFrom(params) {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * History (design section 06): a full-width table, newest first, 10 per page. A click anywhere
 * on a row opens the saved report, read-only; the message link in the first cell is the
 * keyboard target. Below 600 px the rows become cards (index.css).
 */
export function HistoryPage() {
  usePageTitle('History');
  const [params, setParams] = useSearchParams();
  const page = pageFrom(params);
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.checkList(page, HISTORY_PAGE_SIZE),
    queryFn: () => listChecks({ page, size: HISTORY_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  // After deleting, the page asked for may no longer exist: show the last one instead.
  if (data && data.totalPages > 0 && page > data.totalPages) {
    return <Navigate to={`/history?page=${data.totalPages}`} replace />;
  }

  const total = data?.totalItems ?? 0;

  return (
    <main className="main top" id="main">
      <div className="page-head">
        <h1>History</h1>
        {data && (
          <span className="muted pb-1">
            {total} {total === 1 ? 'check' : 'checks'}
          </span>
        )}
        {total > 0 && (
          <button type="button" className="btn btn-line btn-danger-line sp" onClick={() => setConfirmOpen(true)}>
            <IconTrash aria-hidden="true" /> Delete history
          </button>
        )}
      </div>

      {query.isPending && <SkeletonPanel label="Loading your history" rows={6} />}
      {query.isError && <ErrorPanel error={query.error} onRetry={() => query.refetch()} />}
      {data && total === 0 && (
        <EmptyState
          icon={IconHistory}
          title="No checks yet"
          action={
            <Link className="btn btn-copper sm" to="/">
              Check a message
            </Link>
          }
        >
          Your checks will show here so you can look back.
        </EmptyState>
      )}
      {data && total > 0 && (
        <div className="tablewrap">
          <table className="tbl">
            <caption className="sr">Your saved checks, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Message</th>
                <th scope="col">Verdict</th>
                <th scope="col" className="hide-md">
                  Flags
                </th>
                <th scope="col" className="hide-md">
                  Links
                </th>
                <th scope="col">Checked</th>
                <th scope="col">
                  <span className="sr">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/history/${item.id}`)}>
                  <td className="msgcell">
                    <Link to={`/history/${item.id}`} onClick={(event) => event.stopPropagation()}>
                      {item.preview}
                    </Link>
                    <small>
                      {item.primaryDomain ?? (item.linkCount > 0 ? null : 'No links')}
                      {item.reportStatus && (item.primaryDomain || item.linkCount === 0) && ' · '}
                      <HistoryReportLine status={item.reportStatus} />
                    </small>
                  </td>
                  <td>
                    <VerdictTag verdict={item.verdict} />
                  </td>
                  <td className="hide-md nowrap">{item.flagCount}</td>
                  <td className="hide-md nowrap">{item.linkCount}</td>
                  <td className="nowrap when">{formatShortDateTime(item.checkedAt)}</td>
                  <td className="chev" aria-hidden="true">
                    <IconChevronRight />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={data.page}
            size={data.size}
            totalItems={data.totalItems}
            totalPages={data.totalPages}
            onPage={(next) => setParams(next === 1 ? {} : { page: String(next) })}
          />
        </div>
      )}

      <DeleteHistoryDialog open={confirmOpen} total={total} onClose={() => setConfirmOpen(false)} />
    </main>
  );
}
