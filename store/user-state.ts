import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { User } from '@/constants/dataInterface';

export const USER_CACHE_DURATION_MS = 1 * 24 * 60 * 60 * 1000;

export interface UserState {
  user: User | null;
  lastFetchedAt: number | null;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  clearUser: () => void;
  shouldRefreshUser: () => boolean;
}

export const useMyStateUser = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      lastFetchedAt: null,

      setUser: (user: User) =>
        set({
          user,
          lastFetchedAt: Date.now(),
        }),

      updateUser: (updates: Partial<User>) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...updates,
              }
            : null,
          lastFetchedAt: state.user ? Date.now() : state.lastFetchedAt,
        })),

      clearUser: () =>
        set({
          user: null,
          lastFetchedAt: null,
        }),

      shouldRefreshUser: () => {
        const { user, lastFetchedAt } = get();

        if (!user || !lastFetchedAt) {
          return true;
        }

        return Date.now() - lastFetchedAt >= USER_CACHE_DURATION_MS;
      },
    }),
    {
      name: 'my-state-user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function useUserStoreHydrated() {
  const [hydrated, setHydrated] = useState(() => useMyStateUser.persist.hasHydrated());

  useEffect(() => {
    if (useMyStateUser.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useMyStateUser.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  return hydrated;
}
