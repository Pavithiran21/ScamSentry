import { QueryClient } from '@tanstack/react-query';

/**
 * Server data cache. A 4xx answer won't change by asking again (not found, forbidden), so only
 * network errors and 5xx answers are retried, at most twice.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.status;
        const worthRetrying = status === 0 || status >= 500;
        return worthRetrying && failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
