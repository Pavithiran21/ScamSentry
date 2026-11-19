import { IconArrowRight, IconChevronRight, IconFlag } from '@tabler/icons-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { queryKeys } from '../../api/queryKeys';
import { getMyReport, listMyReports, markReportSeen } from '../../api/reports';
import { Pager } from '../../components/Pager';
import { EmptyState, ErrorPanel, SkeletonPanel } from '../../components/StatePanels';
import { VerdictTag } from '../../components/VerdictTag';
import { NARROW_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isNotFound } from '../../lib/apiErrors';
import { formatShortDate } from '../../lib/dates';
import { reportRef } from '../../lib/reports';
import { NotFoundPanel } from '../../pages/NotFoundPage';
import { ReportStatusTag } from '../history/reportStatus';
import { NewResultNotice, ReportView } from './ReportView';

function pageFrom(params) {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * My reports (/reports and /reports/:id): the table, and beside it the report the user opened.
 * Below 860 px the table and the report are separate screens. Opening a decided report for the
 * first time marks it seen, which clears its "New" tag and the dot on the tab.
 */
export function MyReportsPage() {
  usePageTitle('My reports');
  const { id } = useParams();
  const narrow = useMediaQuery(NARROW_QUERY);
  const detail = useReportDetail(id);

  if (narrow && id) {
    return (
      <main className="main top" id="main">
        <h1 className="sr">My reports</h1>
        {detail.notice && <NewResultNotice report={detail.notice} />}
        <ReportDetailPane detail={detail} backLink />
      </main>
    );
  }

  return (
    <main className="main top" id="main">
      <div className="page-head">
        <h1>My reports</h1>
      </div>
      {detail.notice && <NewResultNotice report={detail.notice} />}
      <div className="grid2 start">
        <ReportsTable selectedId={id} />
        {!narrow && (id ? <ReportDetailPane detail={detail} /> : <PickAReport />)}
      </div>
    </main>
  );
}

/**
 * Loads one report and, the first time a decided one is opened, marks it seen (POST
 * /reports/:id/seen). The page notice shows while the report is unseen or was marked seen in this
 * visit (the seen mutation's variables), so it stays after the refetch clears the flag.
 */
function useReportDetail(id) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.report(id), queryFn: () => getMyReport(id), enabled: Boolean(id) });
  const markedRef = useRef(null);

  const seen = useMutation({
    mutationFn: markReportSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports });
    },
  });
  const { mutate: markSeen } = seen;

  const report = id ? query.data : undefined;
  useEffect(() => {
    if (report?.unseen && markedRef.current !== report.id) {
      markedRef.current = report.id; // once per report, also under StrictMode's double effect
      markSeen(report.id);
    }
  }, [report, markSeen]);

  const showNotice = report && report.status !== 'open' && (report.unseen || seen.variables === report.id);
  return { query, notice: showNotice ? report : null };
}

function ReportDetailPane({ detail, backLink = false }) {
  const { query } = detail;
  if (query.isPending) {
    return <SkeletonPanel label="Loading the report" rows={6} />;
  }
  if (query.isError) {
    return isNotFound(query.error) ? <NotFoundPanel /> : <ErrorPanel error={query.error} onRetry={() => query.refetch()} />;
  }
  return <ReportView report={query.data} backLink={backLink} />;
}

function PickAReport() {
  return (
    <div className="card">
      <h2>Your report</h2>
      <p className="muted text-[15px]">Open a report to see what the moderator decided and their note.</p>
    </div>
  );
}

function ReportsTable({ selectedId }) {
  const [params, setParams] = useSearchParams();
  const page = pageFrom(params);
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.reportList(page),
    queryFn: () => listMyReports({ page }),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) {
    return <SkeletonPanel label="Loading your reports" rows={5} />;
  }
  if (query.isError) {
    return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />;
  }
  const data = query.data;
  if (data.totalItems === 0) {
    return (
      <EmptyState icon={IconFlag} title="No reports yet">
        If a verdict looks wrong, open a saved check and choose “Report wrong verdict”.
      </EmptyState>
    );
  }

  const linkTo = (reportId) => `/reports/${reportId}${page > 1 ? `?page=${page}` : ''}`;
  return (
    <div className="tablewrap">
      <table className="tbl">
        <caption className="sr">Your reports, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Message</th>
            <th scope="col" className="hide-md">
              We said → you said
            </th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr
              key={item.id}
              className={item.id === selectedId || item.unseen ? 'sel' : undefined}
              onClick={() => navigate(linkTo(item.id))}
            >
              <td className="msgcell">
                <Link
                  to={linkTo(item.id)}
                  aria-current={item.id === selectedId ? 'page' : undefined}
                  onClick={(event) => event.stopPropagation()}
                >
                  {item.preview ?? 'Message copy deleted'}
                </Link>
                <small>
                  {reportRef(item.id)} · reported {formatShortDate(item.createdAt)}
                </small>
              </td>
              <td className="hide-md nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <VerdictTag verdict={item.verdict} withIcon={false} />
                  <IconArrowRight aria-hidden="true" />
                  <span className="sr">changed to</span>
                  <VerdictTag verdict={item.suggestedVerdict} withIcon={false} />
                </span>
              </td>
              <td>
                <ReportStatusTag status={item.status} unseen={item.unseen} />
              </td>
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
  );
}
