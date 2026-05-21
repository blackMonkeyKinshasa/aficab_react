import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppConfiguration, getAppConfiguration } from '@/api/mobileConfig';

interface AppConfigState {
  appConfig: AppConfiguration | null;
  lastUpdatePhone: string | null;
  appIsLock: boolean;
  refreshing: boolean;
  localClientVersion?: number;
  setAppConfig: (appConfig: AppConfiguration, appIsLock: boolean) => void;
  setLastUpdatePhone: (lastUpdatePhone: string) => void;
  shouldFetchAppConfig: () => boolean;
  refreshAppConfig: () => Promise<{ appConfig: AppConfiguration; appIsLock: boolean }>;
  clearAppConfig: () => void;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getFallbackBuildVersion() {
  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.ios?.buildNumber ?? '0';
  }

  return String(Constants.expoConfig?.android?.versionCode ?? '0');
}

function getLocalClientVersion() {
  const rawVersion = Application.nativeBuildVersion ?? getFallbackBuildVersion();
  const parsedVersion = Number.parseInt(rawVersion ?? '0', 10);
  console.log('Local client version:', parsedVersion);
  return Number.isFinite(parsedVersion) ? parsedVersion : 0;
}

export const useAppConfigState = create<AppConfigState>()(
  persist(
    (set, get) => ({
      appConfig: null,
      lastUpdatePhone: null,
      appIsLock: false,
      refreshing: false,
      localClientVersion: getLocalClientVersion(),

      setAppConfig: (appConfig, appIsLock) =>
        set({
          appConfig,
          appIsLock,
        }),

      setLastUpdatePhone: (lastUpdatePhone) =>
        set({
          lastUpdatePhone,
        }),

      shouldFetchAppConfig: () => get().lastUpdatePhone !== getTodayKey(),

      refreshAppConfig: async () => {
        set({ refreshing: true });

        try {
          const appConfig = await getAppConfiguration();
          const localClientVersion = getLocalClientVersion();
          const appIsLock = localClientVersion < appConfig.version_client;

          set({
            appConfig,
            appIsLock,
            lastUpdatePhone: getTodayKey(),
            refreshing: false,
          });

          return { appConfig, appIsLock };
        } catch (error) {
          set({ refreshing: false });
          throw error;
        }
      },

      clearAppConfig: () =>
        set({
          appConfig: null,
          lastUpdatePhone: null,
          appIsLock: false,
          refreshing: false,
        }),
    }),
    {
      name: 'my-state-app-config',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);