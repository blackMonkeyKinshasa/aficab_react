import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppLanguage = 'fr' | 'en';

type StoreSetter<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;

export interface AppLanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

export const useAppLanguageState = create<AppLanguageState>()(
  persist(
    (set: StoreSetter<AppLanguageState>) => ({
      language: 'fr',
      setLanguage: (language: AppLanguage) => set({ language }),
    }),
    {
      name: 'my-state-app-language',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
