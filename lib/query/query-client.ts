import { QueryClient } from '@tanstack/react-query';

import { isApiNetworkError, isNetworkFailure } from '@/lib/network';

type ApiLikeError = Error & { status?: number };

function isClientHttpError(error: unknown) {
  const status = (error as ApiLikeError | undefined)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (isApiNetworkError(error) || isNetworkFailure(error)) {
    return false;
  }

  if (isClientHttpError(error)) {
    return false;
  }

  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
        staleTime: 15_000,
        gcTime: 10 * 60 * 1000,
        networkMode: 'online',
      },
      mutations: {
        retry: false,
        networkMode: 'online',
      },
    },
  });
}

export const queryClient = createQueryClient();
