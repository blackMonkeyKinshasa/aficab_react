import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppConfiguration, getAppConfiguration } from '@/api/mobileConfig';

export interface AppConfigState {
  appConfig: AppConfiguration | null;
  lastUpdatePhone: string | null;
  appIsLock: boolean;
  refreshing: boolean;
  localClientVersion: number;
  setAppConfig: (appConfig: AppConfiguration, appIsLock: boolean) => void;
  setLastUpdatePhone: (lastUpdatePhone: string) => void;
  shouldFetchAppConfig: () => boolean;
  recomputeLockFromLocalVersion: () => boolean;
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

export function getLocalClientVersion() {
  const rawVersion = Application.nativeBuildVersion ?? getFallbackBuildVersion();
  const parsedVersion = Number.parseInt(rawVersion ?? '0', 10);
  return Number.isFinite(parsedVersion) ? parsedVersion : 0;
}

export function isClientVersionBlocked(versionClient: number | null | undefined) {
  if (typeof versionClient !== 'number' || !Number.isFinite(versionClient)) {
    return false;
  }

  return getLocalClientVersion() < versionClient;
}

export const useAppConfigState = create<AppConfigState>()(
  persist(
    (set, get) => ({
      appConfig: null,
      lastUpdatePhone: null,
      appIsLock: false,
      refreshing: false,
      localClientVersion: getLocalClientVersion(),

      setAppConfig: (appConfig: AppConfiguration, appIsLock: boolean) =>
        set({
          appConfig,
          appIsLock,
          localClientVersion: getLocalClientVersion(),
        }),

      setLastUpdatePhone: (lastUpdatePhone: string) =>
        set({
          lastUpdatePhone,
        }),

      recomputeLockFromLocalVersion: () => {
        const localClientVersion = getLocalClientVersion();
        const appIsLock = isClientVersionBlocked(get().appConfig?.version_client);

        set({
          localClientVersion,
          appIsLock,
        });

        return appIsLock;
      },

      shouldFetchAppConfig: () => {
        const { lastUpdatePhone, appConfig, appIsLock } = get();
        const localClientVersion = getLocalClientVersion();

        if (!appConfig) {
          return true;
        }

        if (appIsLock || isClientVersionBlocked(appConfig.version_client)) {
          return true;
        }

        if (get().localClientVersion !== localClientVersion) {
          return true;
        }

        return lastUpdatePhone !== getTodayKey();
      },

      refreshAppConfig: async () => {
        set({ refreshing: true, localClientVersion: getLocalClientVersion() });

        try {
          const appConfig = await getAppConfiguration();
          const appIsLock = isClientVersionBlocked(appConfig.version_client);

          set({
            appConfig,
            appIsLock,
            localClientVersion: getLocalClientVersion(),
            lastUpdatePhone: getTodayKey(),
            refreshing: false,
          });

          return { appConfig, appIsLock };
        } catch (error) {
          const appIsLock = isClientVersionBlocked(get().appConfig?.version_client);
          set({
            refreshing: false,
            localClientVersion: getLocalClientVersion(),
            appIsLock,
          });
          throw error;
        }
      },

      clearAppConfig: () =>
        set({
          appConfig: null,
          lastUpdatePhone: null,
          appIsLock: false,
          refreshing: false,
          localClientVersion: getLocalClientVersion(),
        }),
    }),
    {
      name: 'my-state-app-config',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        appConfig: state.appConfig,
        lastUpdatePhone: state.lastUpdatePhone,
      }),
      onRehydrateStorage: () => (state) => {
        state?.recomputeLockFromLocalVersion();
      },
    }
  )
);
