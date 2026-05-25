import '@/global.css';
import 'react-native-url-polyfill/auto'
import { User } from '@supabase/supabase-js';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme, Snackbar } from 'react-native-paper';
import { en, fr, registerTranslation } from 'react-native-paper-dates';
import {NotificationIcon} from '@/components/my-ui/NotificationIcon';
import { useMyStateUser } from '@/store';
import { getUserByID } from '@/api/user';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearNotificationBadgeAsync,
  ensureNotificationsReady,
  getLastNotificationResponseAsync,
  getNotificationTargetRoute,
  NotificationLike,
  NotificationSubscription,
  persistUserDeviceToken,
  registerForPushNotificationsAsync,
} from '@/lib/notifications';
import * as Sentry from '@sentry/react-native';
import { PostHog, PostHogProvider, usePostHog } from 'posthog-react-native';
import * as Location from 'expo-location';
import { isDev, isExpoGo } from '@/constants/env';
import { Role } from '@/constants/databaseEnum';
import { color } from '@/constants/colors';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';

const POSTHOG_API_KEY = 'phc_m8BC53KhbQB5qoynPaxb3PDRzqrv7Y9MSFkXcfu5UvYX';
const POSTHOG_HOST = 'https://us.i.posthog.com';

const posthogClient = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
});

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('splash_prevent_auto_hide_failed', error);
});

function reportStartupError(context: string, error: unknown) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  console.error(context, normalizedError);
  Sentry.captureException(normalizedError, {
    tags: { startup_context: context },
  });
  void Sentry.flush();
}

Sentry.init({
  dsn: 'https://dd106e68e9bd011417ba47a381a164de@o4511241427222528.ingest.de.sentry.io/4511241433055312',
  environment: isDev ? 'development' : 'production',
  enabled: true,
  debug: __DEV__,
  sendDefaultPii: true,
  enableLogs: true,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

registerTranslation('en', en);
registerTranslation('fr', fr);

const accentColor = '#FE5900';
const PUBLIC_ROUTES = new Set(['/login', '/signup']);

const paperLightTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: accentColor },
};

const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: accentColor,
    background: color.appDarkBackground,
    surface: color.appDarkBackground,
  },
};

const BackButton = ({ onPress, isDark }: { onPress: () => void; isDark: boolean }) => (
  <TouchableOpacity onPress={onPress} style={{ marginRight: 16 }}>
    <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
  </TouchableOpacity>
);

export default Sentry.wrap(function RootLayout() {
  const { colorScheme } = useColorScheme();
 /* const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-Italic': require('../assets/fonts/Montserrat-Italic.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }
    */

  return (
    // Point d'entree global: tous les ecrans heritent ici des providers analytics/telemetrie.
    <PostHogProvider client={posthogClient}>
      <RootLayoutInner />
    </PostHogProvider>
  );
});

function RootLayoutInner() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSyncingUser, setIsSyncingUser] = useState(false);
  const [pushTokenSnackbarVisible, setPushTokenSnackbarVisible] = useState(false);
  const [pushTokenSnackbarMessage, setPushTokenSnackbarMessage] = useState('');
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const posthog = usePostHog();
  const analytics = useAnalytics();
  const storedUser = useMyStateUser((state) => state.user);
  const setStoredUser = useMyStateUser((state) => state.setUser);
  const updateStoredUser = useMyStateUser((state) => state.updateUser);
  const syncedDeviceTokenRef = useRef<string | null>(null);
  const receivedListenerRef = useRef<NotificationSubscription | null>(null);
  const responseListenerRef = useRef<NotificationSubscription | null>(null);
  const pathnameRef = useRef(pathname);
  const handledInitialNotificationRef = useRef(false);

  const showPushTokenSnackbar = (message: string | null | undefined) => {
    if (!message) {
      return;
    }

    setPushTokenSnackbarMessage(message);
    setPushTokenSnackbarVisible(true);
  };

  const showPushTokenTrace = (source: 'manuel' | 'auto', trace: string[], detail?: string | null) => {
    const baseTrace = [`trace expo token (${source})`, ...trace].join(' -> ');
    const message = detail ? `${baseTrace} -> resultat: ${detail}` : baseTrace;
    showPushTokenSnackbar(message);
  };

  const syncExpoPushToken = async (userId: string, currentDeviceToken?: string | null) => {
    const {
      token: expoPushToken,
      errorMessage,
      trace,
      stage,
    } = await registerForPushNotificationsAsync();

    if (!expoPushToken) {
      return {
        expoPushToken: null,
        errorMessage: errorMessage ?? 'Le token Expo est indisponible pour le moment.',
        trace,
        stage,
      };
    }

    if (currentDeviceToken === expoPushToken) {
      syncedDeviceTokenRef.current = expoPushToken;
      return {
        expoPushToken,
        errorMessage: null,
        trace: [...trace, 'token deja present dans le profil utilisateur'],
        stage: 'already-synced-in-profile',
      };
    }

    if (syncedDeviceTokenRef.current === expoPushToken) {
      return {
        expoPushToken,
        errorMessage: null,
        trace: [...trace, 'token deja synchronise dans cette session'],
        stage: 'already-synced-in-session',
      };
    }

    const persistedTrace = [...trace, 'enregistrement du token dans le backend'];
    const persistedUser = await persistUserDeviceToken(userId, expoPushToken);
    syncedDeviceTokenRef.current = expoPushToken;
    updateStoredUser({ deviceToken: expoPushToken });
    const persistedBackendToken =
      persistedUser && typeof persistedUser === 'object' && 'deviceToken' in persistedUser
        ? String(persistedUser.deviceToken ?? '')
        : '';

    return {
      expoPushToken,
      errorMessage: null,
      backendMessage: persistedBackendToken
        ? `backend deviceToken=${persistedBackendToken}`
        : 'backend a confirme la mise a jour du token',
      trace: [
        ...persistedTrace,
        persistedBackendToken
          ? `backend a retourne deviceToken=${persistedBackendToken}`
          : 'backend a confirme la mise a jour du token',
      ],
      stage: 'persisted',
    };
  };

  const syncStoredUser = async () => {
    if (isSyncingUser) {
      return;
    }

    setIsSyncingUser(true);

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        return;
      }

      const refreshedUser = await getUserByID(authUser.id);

      if (refreshedUser) {
        setStoredUser(refreshedUser);

        if (refreshedUser.role !== Role.CLIENT) {
          analytics.trackRoleMismatchRedirect(authUser.id, {
            email: refreshedUser.email ?? authUser.email ?? '',
            role: refreshedUser.role,
            sourceScreen: 'home',
            targetScreen: 'checkRole',
          });
          router.replace('/chekRole');
          return;
        }

        if (refreshedUser.deviceToken) {
          showPushTokenTrace('manuel', [
            'profil recharge',
            'token deja present sur le compte',
          ], 'aucune regeneration necessaire');
          return;
        }

        const { expoPushToken, errorMessage, trace, backendMessage } = await syncExpoPushToken(authUser.id, refreshedUser.deviceToken);

        if (!expoPushToken) {
          showPushTokenTrace('manuel', ['profil recharge', 'aucun token sur le compte', ...trace], errorMessage);
          return;
        }

        showPushTokenTrace(
          'manuel',
          ['profil recharge', 'aucun token sur le compte', ...trace],
          backendMessage ?? 'token disponible et synchronise'
        );
       
      }
    } catch (error) {
      showPushTokenSnackbar('Une erreur est survenue lors de la synchronisation de votre profil. Veuillez réessayer.');
      console.error('profile_manual_sync_failed', error);
    } finally {
      setIsSyncingUser(false);
    }
  };

  // Centralise l'ouverture de l'ecran cible depuis une notification,
  // en evitant une navigation inutile si l'utilisateur est deja sur la bonne route.
  const openNotificationRoute = (notification: NotificationLike, options?: { seedHistory?: boolean }) => {
    const targetRoute = getNotificationTargetRoute(notification);

    if (pathnameRef.current === targetRoute) {
      return;
    }

    if (options?.seedHistory && targetRoute !== '/') {
      pathnameRef.current = '/';
      router.replace('/');

      requestAnimationFrame(() => {
        pathnameRef.current = targetRoute;
        router.push(targetRoute as never);
      });
      return;
    }

    pathnameRef.current = targetRoute;
    router.push(targetRoute as never);
  };

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    clearNotificationBadgeAsync().catch((error) => {
      reportStartupError('notification_badge_clear_failed', error);
    });

    SplashScreen.hideAsync().catch((error) => {
      reportStartupError('splash_hide_failed', error);
    });
  }, [authReady]);

  useEffect(() => {
    Sentry.setTag('platform', Platform.OS);
  }, []);

  useEffect(() => {
    // Lie la session authentifiee au profil analytics.
    // Quand l'utilisateur se deconnecte, on nettoie le contexte PostHog.
    if (user) {
      const scheme = colorScheme ?? 'light';
      posthog?.identify(user.id, {
        email: user.email ?? '',
        phone: storedUser?.phone ?? 'non renseigné',
        client_type: storedUser?.clientType ?? '',
        city: storedUser?.city ?? '',
        country: storedUser?.country ?? '',
        color_scheme: scheme,
        platform: Platform.OS,
      });
    } else {
      posthog?.reset();
    }
  }, [user, storedUser, colorScheme]);

  useEffect(() => {
    // Une fois connecte, on tente de capturer une position pour enrichir les evenements.
    // Le flow s'arrete silencieusement si la permission n'est pas accordee.
    if (!user) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        posthog?.capture('user_location_captured', {
          user_id: user.id,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          platform: Platform.OS,
        });
      } catch (error) {
        reportStartupError('location_bootstrap_failed', error);
      }
    })();
  }, [user]);

  useEffect(() => {
    // Synchronise l'utilisateur courant avec Sentry pour rattacher les erreurs au bon compte.
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Bootstrap auth: on restaure d'abord la session Supabase persistante au lancement.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        setUser(session?.user ?? null);
      } catch (error) {
        reportStartupError('auth_session_bootstrap_failed', error);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Garde le layout aligne sur les changements login/logout sans recharger l'app.
      setUser(session?.user ?? null);
      //setAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    // Garde le flow de navigation coherent:
    // - visiteur => force vers le login hors routes publiques
    // - utilisateur connecte => renvoie vers l'accueil s'il revient sur login/signup
    const inPublicRoute = PUBLIC_ROUTES.has(pathname);

    if (!user && !inPublicRoute) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inPublicRoute) {
      router.replace('/');
    }
  }, [authReady, pathname, router, user]);

  useEffect(() => {
    let isMounted = true;

    console.log( 'device token :', storedUser?.deviceToken);

    const syncDeviceToken = async () => {
      // Le token push n'est synchronise qu'une fois l'auth connue,
      // puis seulement si le token local a change pour eviter les ecritures inutiles.
      if (!authReady) {
        console.log('auth not ready');
        return;
      }

      if (!user) {
        syncedDeviceTokenRef.current = null;
        console.log('no user, skipping push token sync');
        return;
      }

      try {
        const { expoPushToken, errorMessage, trace, backendMessage } = await syncExpoPushToken(
          user.id,
          storedUser?.id === user.id ? storedUser.deviceToken : null
        );

        console.log('push token received', expoPushToken);

        if (!expoPushToken || !isMounted) {
          console.log('push token not received');
          if (isMounted) {
          //  showPushTokenTrace('auto', ['effet de synchronisation demarre', ...trace], errorMessage);
          }
          return;
        }
        if (isMounted) {
         /* showPushTokenTrace(
            'auto',
            ['effet de synchronisation demarre', ...trace],
            backendMessage ?? 'token disponible et synchronise'
          );*/
        }
        console.log('push token synced');


      } catch (error) {
        reportStartupError('push_token_sync_failed', error);
        console.log('push token sync failed', error);
      }
    };

    syncDeviceToken();

    return () => {
      isMounted = false;
    };
  }, [authReady, storedUser?.deviceToken, storedUser?.id, updateStoredUser, user]);

  useEffect(() => {
    let isMounted = true;

    const attachNotificationListeners = async () => {
      // Au redemarrage, si l'app a ete ouverte depuis une notification,
      // on rejoue la navigation vers l'ecran cible.
      ensureNotificationsReady();

      if (handledInitialNotificationRef.current) {
        return;
      }

      const lastResponse = await getLastNotificationResponseAsync();
      handledInitialNotificationRef.current = true;

      if (lastResponse?.notification && isMounted) {
        await clearNotificationBadgeAsync().catch((error) => {
          reportStartupError('notification_badge_clear_on_boot_failed', error);
        });
        openNotificationRoute(lastResponse.notification, { seedHistory: true });
      }
    };

    // Listener passif: utile pour logger/observer les notifications recues pendant que l'app est ouverte.
    receivedListenerRef.current = addNotificationReceivedListener((notification) => {
      const targetRoute = getNotificationTargetRoute(notification);
      console.log('Notification recue:', notification.request.identifier, targetRoute);
    });

    // Listener d'action: quand l'utilisateur touche la notification, on ouvre l'ecran associe.
    responseListenerRef.current = addNotificationResponseReceivedListener((response) => {
      clearNotificationBadgeAsync().catch((error) => {
        reportStartupError('notification_badge_clear_on_open_failed', error);
      });
      openNotificationRoute(response.notification);
    });

    attachNotificationListeners().catch((error) => {
      reportStartupError('notification_listener_bootstrap_failed', error);
    });

    return () => {
      isMounted = false;
      receivedListenerRef.current?.remove();
      responseListenerRef.current?.remove();
      receivedListenerRef.current = null;
      responseListenerRef.current = null;
    };
  }, [router]);


  if (!authReady) {
    // Evite d'afficher une UI transitoire avant de savoir si une session existe.
    return null;
  }
  return (
    // Arbre racine UI: gestures, bottom sheets, theming natif puis routing Expo Router.
    <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
    <PaperProvider theme={colorScheme === 'dark' ? paperDarkTheme : paperLightTheme}> 
      {/* La police Montserrat est chargée globalement. Utilisez <AppText> pour tous les textes. */}
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

          <Stack screenOptions={{ headerShown: false }}>
                {/* Flow d'authentification: login et creation de compte. */}
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                {/* Flow principal apres connexion: navigation par onglets. */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                {/* Ecran hors tabs, pousse au-dessus du flow principal pour modifier le profil. */}
                <Stack.Screen name="edit-profile" options={{
                  title: t('profile.editTitle'),
                  headerBackTitle: t('booking.back'),
                  headerShown: true,
                  headerTransparent: false,
                  headerRight: () => (
                    <TouchableOpacity
                      onPress={syncStoredUser}
                      disabled={isSyncingUser}
                      style={{ marginRight: 16, opacity: isSyncingUser ? 0.7 : 1 }}
                    >
                      {isSyncingUser ? (
                        <ActivityIndicator
                          size="small"
                          color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                        />
                      ) : (
                        <RefreshCw size={20} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
                      )}
                    </TouchableOpacity>
                  ),
                }}
                />

                <Stack.Screen
                  name="update-app"
                  options={{
                    headerShown: false,
                    gestureEnabled: false,
                  
                  }}
                />

                  {/* Route de secours pour les chemins inconnus. */}
                <Stack.Screen name="+not-found" />

                {/* Flow detail de reservation, ouvert depuis les ecrans du parcours principal. */}
                <Stack.Screen name="new_booking/[doc]" 
                options={{
                  headerShown: true,
                  headerTransparent: false,  
                 
                 }} />

          </Stack>
          
          <PortalHost />
                    <Snackbar
                      visible={pushTokenSnackbarVisible}
                      onDismiss={() => setPushTokenSnackbarVisible(false)}
                      duration={4500}
                      action={{
                        label: t('common.close'),
                        onPress: () => setPushTokenSnackbarVisible(false),
                      }}
                    >
                      {pushTokenSnackbarMessage}
                    </Snackbar>
        </ThemeProvider>

    </PaperProvider>
    </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}