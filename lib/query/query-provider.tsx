import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { QueryClientProvider } from '@tanstack/react-query';

import { setupQueryFocusManager } from '@/lib/query/focus-manager';
import { setupQueryOnlineManager } from '@/lib/query/online-manager';
import { queryClient } from '@/lib/query/query-client';
import { useAppConfigState } from '@/store/app-config-state';

function AppConfigLifecycle() {
  const recomputeLockFromLocalVersion = useAppConfigState(
    (state) => state.recomputeLockFromLocalVersion
  );

  useEffect(() => {
    recomputeLockFromLocalVersion();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        recomputeLockFromLocalVersion();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [recomputeLockFromLocalVersion]);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unsubscribeFocus = setupQueryFocusManager();
    const unsubscribeOnline = setupQueryOnlineManager();

    return () => {
      unsubscribeFocus();
      unsubscribeOnline();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigLifecycle />
      {children}
    </QueryClientProvider>
  );
}
