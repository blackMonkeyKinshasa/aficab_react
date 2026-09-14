import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { getUserByID } from '@/api/user';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { MainLayout } from '@/components/my-ui/MainLayout';
import { buildStackScreenOptions, HEADER_SIDE_WIDTH } from '@/components/my-ui/ScreenHeader';
import { Role } from '@/constants/databaseEnum';
import { useAnalytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { useMyStateUser } from '@/store';
import { useAppConfigState } from '@/store/app-config-state';

type ApiUserError = Error & { status?: number; code?: string };
type UserStoreState = ReturnType<typeof useMyStateUser.getState>;
type AppConfigStoreState = ReturnType<typeof useAppConfigState.getState>;

const SCREEN_OPTIONS = (isDark: boolean, onPress: () => void) =>
  buildStackScreenOptions({
    title: '',
    isDark,
    headerRight: () => (
      <View style={{ width: HEADER_SIDE_WIDTH, alignItems: 'flex-end' }}>
        <NotificationIcon isDark={isDark} onPress={onPress} />
      </View>
    ),
  });

function isUserNotFoundError(error: unknown) {
  const apiError = error as ApiUserError | undefined;

  return (
    apiError?.status === 404 ||
    apiError?.code === 'USER_NOT_FOUND' ||
    apiError?.message === 'User not found'
  );
}

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const analytics = useAnalytics();

  const [loading, setLoading] = useState(false);
  const storedUser = useMyStateUser((state: UserStoreState) => state.user);
  const setStoredUser = useMyStateUser((state: UserStoreState) => state.setUser);
  const clearStoredUser = useMyStateUser((state: UserStoreState) => state.clearUser);
  const appIsLock = useAppConfigState((state: AppConfigStoreState) => state.appIsLock);
  const shouldFetchAppConfig = useAppConfigState(
    (state: AppConfigStoreState) => state.shouldFetchAppConfig
  );
  const refreshAppConfig = useAppConfigState(
    (state: AppConfigStoreState) => state.refreshAppConfig
  );
  const recomputeLockFromLocalVersion = useAppConfigState(
    (state: AppConfigStoreState) => state.recomputeLockFromLocalVersion
  );

  useEffect(() => {
    if (storedUser?.id && !storedUser.full_name?.trim()) {
      router.replace('/create-profile');
    }
  }, [router, storedUser?.full_name, storedUser?.id]);

  useEffect(() => {
    let isMounted = true;
    const { user: cachedUser, shouldRefreshUser } = useMyStateUser.getState();
    const mustRefreshUser = shouldRefreshUser();

    if (cachedUser?.id && !mustRefreshUser) {
      if (cachedUser.role === Role.DRIVER) {
        analytics.trackRoleMismatchRedirect(cachedUser.id, {
          email: cachedUser.email ?? cachedUser.email ?? '',
          role: cachedUser?.role,
          sourceScreen: 'home',
          targetScreen: 'chekRole',
        });
        router.replace('/chekRole');
        return;
      }
      return;
    }

    const loadUser = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) {
          return;
        }

        if (cachedUser?.id === user.id && !mustRefreshUser) {
          if (!cachedUser.full_name?.trim()) {
            router.replace('/create-profile');
          }
          return;
        }

        try {
          const freshUser = await getUserByID(user.id);

          if (freshUser.role === Role.DRIVER) {
            analytics.trackRoleMismatchRedirect(user.id, {
              email: freshUser.email ?? user.email ?? '',
              role: freshUser.role,
              sourceScreen: 'home',
              targetScreen: 'chekRole',
            });
            router.replace('/chekRole');
            return;
          }

          if (!freshUser || !isMounted) {
            return;
          }

          setStoredUser(freshUser);

          if (!freshUser.full_name?.trim()) {
            router.replace('/create-profile');
          }
        } catch (error) {
          if (isUserNotFoundError(error)) {
            clearStoredUser();
            router.replace('/create-profile');
            return;
          }

          console.error('Erreur lors de la récupération de l’utilisateur:', error);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [analytics, clearStoredUser, router, setStoredUser]);

  useEffect(() => {
    if (loading || !storedUser?.id || !storedUser.full_name?.trim()) {
      return;
    }

    const currentlyLocked = recomputeLockFromLocalVersion() || appIsLock;

    if (currentlyLocked) {
      router.replace('/update-app');
      return;
    }

    if (!shouldFetchAppConfig()) {
      return;
    }

    let isMounted = true;

    const syncAppConfiguration = async () => {
      try {
        const result = await refreshAppConfig();

        if (isMounted && result.appIsLock) {
          router.replace('/update-app');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la configuration mobile:', error);
      }
    };

    syncAppConfiguration();

    return () => {
      isMounted = false;
    };
  }, [
    appIsLock,
    loading,
    recomputeLockFromLocalVersion,
    refreshAppConfig,
    router,
    shouldFetchAppConfig,
    storedUser?.full_name,
    storedUser?.id,
  ]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS(isDark, () => router.push('/notificationsPage'))} />

      <View style={{ flex: 1 }}>
        <MainLayout />
      </View>

      {loading && <LoadingView />}
    </>
  );
}
