import '@/global.css';
import 'react-native-url-polyfill/auto'
import { User } from '@supabase/supabase-js';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArrowLeft } from 'lucide-react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { en, registerTranslation } from 'react-native-paper-dates';
import {NotificationIcon} from '@/components/my-ui/NotificationIcon';

registerTranslation('fr', en);

const paperTheme = {
  colors: {
    primary: '#FE5900',
  },
};

const BackButton = ({ onPress, isDark }: { onPress: () => void; isDark: boolean }) => (
  <TouchableOpacity onPress={onPress} style={{ marginRight: 16 }}>
    <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
  </TouchableOpacity>
);

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        setUser(session?.user ?? null);
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
      setUser(session?.user ?? null);
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

    const inAuthRoute = pathname === '/login';

    if (!user && !inAuthRoute) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inAuthRoute) {
      router.replace('/');
    }
  }, [authReady, pathname, router, user]);


  if (!authReady) {
    return null;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <PaperProvider theme={paperTheme}> 
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

          <Stack screenOptions={{ headerShown: false }}>
                {/* Auth Stack */}
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                {/* Main Tabs */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                {/* Profile Edit Screen - Modal */}
                <Stack.Screen name="edit-profile" options={{
                  title: 'Modifier le profil',
                  headerBackTitle: 'Retour',
                  headerShown: true,
                  headerTransparent: false,
                 
                }}
                />

                  {/* Other Screens */}
                <Stack.Screen name="+not-found" />

                <Stack.Screen name="new_booking/[doc]" 
                options={{
                  headerShown: true,
                  headerTransparent: false,
                 }} />

          </Stack>
          
          <PortalHost />
        </ThemeProvider>

    </PaperProvider>
    </GestureHandlerRootView>
  );
}