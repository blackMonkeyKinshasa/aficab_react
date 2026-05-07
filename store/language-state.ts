import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppLanguage = 'fr' | 'en';

interface AppLanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

export const useAppLanguageState = create<AppLanguageState>()(
  persist(
    (set) => ({
      language: 'fr',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'my-state-app-language',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);