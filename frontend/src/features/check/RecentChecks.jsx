import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listChecks } from '../../api/checks';
import { queryKeys } from '../../api/queryKeys';
import { VerdictTag } from '../../components/VerdictTag';

const RECENT_COUNT = 4;

/** The last four saved checks beside the signed-in check panel, with "See all in History". */
export function RecentChecks() {
  const query = useQuery({
    queryKey: queryKeys.checkList(1, RECENT_COUNT),
    queryFn: () => listChecks({ page: 1, size: RECENT_COUNT }),
  });
  const items = query.data?.items ?? [];

  return (
    <aside className="card" aria-labelledby="recent-title">
      <h2 id="recent-title">Recent checks</h2>
      {query.isPending && (
        <div role="status">
          <span className="sr">Loading recent checks</span>
          <div className="skel" />
          <div className="skel w-3/5" />
          <div className="skel" />
        </div>
      )}
      {query.isError && <p className="muted text-[15px]">Couldn&apos;t load your recent checks.</p>}
      {query.isSuccess && items.length === 0 && (
        <p className="muted text-[15px]">No checks yet. Your checks will show here so you can look back.</p>
      )}
      {items.length > 0 && (
        <ul className="recent">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/history/${item.id}`}>{item.preview}</Link>
              <VerdictTag verdict={item.verdict} withIcon={false} />
            </li>
          ))}
        </ul>
      )}
      <Link className="link-c mt-2 inline-block" to="/history">
        See all in History
      </Link>
    </aside>
  );
}
