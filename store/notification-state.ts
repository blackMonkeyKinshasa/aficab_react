import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getActivity } from '@/api/activity';
import { supabase } from '@/lib/supabase';

export interface NotifState {
  countNotif: number;
  isFetchingCount: boolean;
  lastFetchedUserId: string | null;
  fetchUnreadCount: (options?: { force?: boolean }) => Promise<void>;
  setCountNotif: (count: number) => void;
  decrementCountNotif: () => void;
  clearCountNotif: (options?: { resetUser?: boolean }) => void;
}

export const useMyStateNotif = create<NotifState>()(
  persist(
    (set, get) => ({
      countNotif: 0,
      isFetchingCount: false,
      lastFetchedUserId: null,

      fetchUnreadCount: async (options?: { force?: boolean }) => {
        const { isFetchingCount, lastFetchedUserId } = get();

        if (isFetchingCount) {
          return;
        }

        set({ isFetchingCount: true });

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            set({ countNotif: 0, lastFetchedUserId: null });
            return;
          }

          if (!options?.force && lastFetchedUserId === user.id) {
            return;
          }

          const unreadActivities = await getActivity({ userId: user.id, isRead: '0' });

          set({
            countNotif: unreadActivities.length,
            lastFetchedUserId: user.id,
          });
        } catch {
          // Keep the last known count if the refresh fails.
        } finally {
          set({ isFetchingCount: false });
        }
      },

      setCountNotif: (count: number) =>
        set({
          countNotif: count,
        }),

      decrementCountNotif: () =>
        set((state) => ({
          countNotif: Math.max(0, state.countNotif - 1),
        })),

      clearCountNotif: (options?: { resetUser?: boolean }) =>
        set((state) => ({
          countNotif: 0,
          lastFetchedUserId: options?.resetUser ? null : state.lastFetchedUserId,
        })),
    }),
    {
      name: 'my-state-notification',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        countNotif: state.countNotif,
        lastFetchedUserId: state.lastFetchedUserId,
      }),
    }
  )
);
