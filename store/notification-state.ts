import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type StoreSetter<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;

export interface NotifState {
  countNotif: number;
  setCountNotif: (count: number) => void;
  clearCountNotif: () => void;
}

export const useMyStateNotif = create<NotifState>()(
  persist(
    (set: StoreSetter<NotifState>) => ({
      countNotif: 0,

      setCountNotif: (count: number) =>
        set({
          countNotif: count,
        }),

      clearCountNotif: () =>
        set({
          countNotif: 0,
        }),
    }),
    {
      name: 'my-state-notification',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
