import { IconArrowRight, IconCircleCheck, IconListDetails, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { getSummary, listQueue, QUEUE_PAGE_SIZE } from '../../api/moderation';
import { queryKeys } from '../../api/queryKeys';
import { Pager } from '../../components/Pager';
import { EmptyState, ErrorPanel, SkeletonPanel } from '../../components/StatePanels';
import { VerdictTag } from '../../components/VerdictTag';
import { NARROW_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatAge } from '../../lib/dates';
import { reportRef } from '../../lib/reports';
import { ReportPane } from './ReportPane';

const TABS = [
  { status: 'open', label: 'Open' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'overturned', label: 'Overturned' },
];

/** The queue's tab, sort and page live in the address (ids and filters only, never message text). */
function useQueueParams() {
  const [params, setParams] = useSearchParams();
  const status = TABS.some((tab) => tab.status === params.get('status')) ? params.get('status') : 'open';
  const sort = params.get('sort') === 'newest' ? '-createdAt' : 'createdAt';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  return { params, setParams, status, sort, page };
}

/**
 * The review queue (/review and /review/:id), the moderator's 2-pane workspace: the queue list
 * with status tabs on the left, the open report on the right. Below 860 px the list and the
 * report are separate screens with a Back link.
 */
export function ReviewPage() {
  usePageTitle('Review queue');
  const { id } = useParams();
  const narrow = useMediaQuery(NARROW_QUERY);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params } = useQueueParams();
  const search = params.toString() ? `?${params}` : '';

  // Next report: the oldest open report that isn't this one, or the empty queue.
  async function goToNext() {
    const queue = await queryClient.fetchQuery({
      queryKey: queryKeys.modQueue('open', 'createdAt', 1),
      queryFn: () => listQueue({ status: 'open', sort: 'createdAt', page: 1 }),
      staleTime: 0,
    });
    const next = queue.items.find((item) => item.id !== id);
    navigate(next ? `/review/${next.id}` : '/review');
  }

  const pane = id ? (
    <ReportPane key={id} reportId={id} onNext={goToNext} backTo={narrow ? `/review${search}` : null} />
  ) : (
    <section className="mdetail" aria-label="No report open">
      <h2>Pick a report</h2>
      <p className="muted text-[15px]">
        Open a report from the queue to read it and decide. Use the arrow keys to move through the list and Enter to
        open one.
      </p>
    </section>
  );

  return (
    <main className="main top" id="main">
      <h1 className="sr">Review queue</h1>
      <div className="mod-shell">
        {narrow ? (
          id ? pane : <QueueColumn selectedId={id} />
        ) : (
          <div className="mgrid">
            <QueueColumn selectedId={id} />
            {pane}
          </div>
        )}
      </div>
    </main>
  );
}

function QueueColumn({ selectedId }) {
  const navigate = useNavigate();
  const { params, setParams, status, sort, page } = useQueueParams();
  const listRef = useRef(null);
  const summary = useQuery({ queryKey: queryKeys.modSummary, queryFn: getSummary });
  const queue = useQuery({
    queryKey: queryKeys.modQueue(status, sort, page),
    queryFn: () => listQueue({ status, sort, page }),
    placeholderData: keepPreviousData,
  });

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next);
  }

  function open(reportId) {
    navigate({ pathname: `/review/${reportId}`, search: params.toString() });
  }

  // Arrow keys move between the reports, Home and End jump to the ends, Enter or Space opens one.
  function handleListKey(event) {
    const options = [...listRef.current.querySelectorAll('[role="option"]')];
    const index = options.indexOf(document.activeElement);
    const moves = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: options.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      const target = Math.min(options.length - 1, Math.max(0, moves[event.key]));
      options[target]?.focus();
    }
  }

  // Left and Right move between the status tabs (the usual tablist keys).
  function handleTabKey(event, index) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();
    const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    update({ status: TABS[nextIndex].status === 'open' ? null : TABS[nextIndex].status, page: null });
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
  }

  const items = queue.data?.items ?? [];
  const tabLabel = TABS.find((tab) => tab.status === status).label;
  const focusIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));

  return (
    <div className="min-w-0">
      <div className="mhead">
        <div className="tab-row" role="tablist" aria-label="Report status">
          {TABS.map((tab, index) => (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={tab.status === status}
              tabIndex={tab.status === status ? 0 : -1}
              onClick={() => update({ status: tab.status === 'open' ? null : tab.status, page: null })}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              {tab.label} {summary.data && <span className="cnt">{summary.data[tab.status]}</span>}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="sort"
          onClick={() => update({ sort: sort === 'createdAt' ? 'newest' : null, page: null })}
        >
          {sort === 'createdAt' ? (
            <>
              <IconSortAscending aria-hidden="true" /> Oldest first
            </>
          ) : (
            <>
              <IconSortDescending aria-hidden="true" /> Newest first
            </>
          )}
        </button>
      </div>

      {queue.isPending && (
        <div className="p-4">
          <SkeletonPanel label="Loading the queue" rows={5} />
        </div>
      )}
      {queue.isError && (
        <div className="p-4">
          <ErrorPanel error={queue.error} onRetry={() => queue.refetch()} />
        </div>
      )}
      {queue.isSuccess && items.length === 0 && (
        <div className="p-4">
          {status === 'open' ? (
            <EmptyState icon={IconCircleCheck} badgeClass="b-safe" title="No open reports. Nice work.">
              New reports will appear here, oldest first.
            </EmptyState>
          ) : (
            <EmptyState icon={IconListDetails} title={`No ${tabLabel.toLowerCase()} reports yet`}>
              Decided reports stay here, readable, after the decision.
            </EmptyState>
          )}
        </div>
      )}
      {items.length > 0 && (
        <>
          <div ref={listRef} role="listbox" aria-label={`${tabLabel} reports`} onKeyDown={handleListKey}>
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="tri"
                role="option"
                aria-selected={item.id === selectedId}
                tabIndex={index === focusIndex ? 0 : -1}
                onClick={() => open(item.id)}
              >
                <b>{item.textPurged ? 'Message copy deleted' : item.preview}</b>
                <span className="age">
                  {formatAge(item.createdAt)}
                  {status !== 'open' && ' ago'}
                </span>
                <span className="meta">
                  {reportRef(item.id)} · we said <VerdictTag verdict={item.verdict} withIcon={false} />{' '}
                  <IconArrowRight aria-hidden="true" /> user says{' '}
                  <VerdictTag verdict={item.suggestedVerdict} withIcon={false} />
                </span>
              </button>
            ))}
          </div>
          <div className="kbd-hint">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> move between reports · <kbd>Enter</kbd> opens one
            </span>
          </div>
          {queue.data.totalPages > 1 && (
            <Pager
              page={queue.data.page}
              size={QUEUE_PAGE_SIZE}
              totalItems={queue.data.totalItems}
              totalPages={queue.data.totalPages}
              onPage={(next) => update({ page: next === 1 ? null : String(next) })}
            />
          )}
        </>
      )}
    </div>
  );
}
