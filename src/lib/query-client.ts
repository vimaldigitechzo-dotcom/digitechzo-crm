import { QueryClient } from '@tanstack/react-query';

/**
 * Global TanStack Query client instance configured for robust mobile & desktop connectivity
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: true, // Automatically reload latest data when user unlocks phone or switches back to tab
      refetchOnReconnect: true, // Automatically refetch if Wi-Fi or cellular drops and reconnects
      retry: (failureCount, error: any) => {
        // Do not retry client 401/403/404 errors
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        // Retry up to 3 times for cold starts and network glitches
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff (1s, 2s, 4s...)
    },
  },
});
