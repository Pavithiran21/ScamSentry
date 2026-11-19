import { useQuery } from '@tanstack/react-query';
import { getDemoAccounts } from '../../api/demo';
import { queryKeys } from '../../api/queryKeys';

/**
 * GET /demo/accounts. The route exists only with DEMO_MODE=true, so a 404 simply means demo
 * mode is off: isDemoMode is then false and the "Try the demo" link is hidden.
 */
export function useDemoAccounts() {
  const query = useQuery({
    queryKey: queryKeys.demoAccounts,
    queryFn: getDemoAccounts,
    retry: false,
    staleTime: Infinity,
  });
  return { ...query, isDemoMode: query.isSuccess };
}
