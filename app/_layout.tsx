import '@/global.css';
import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { View, Text } from 'react-native';
import { LoginScreen } from '@/components/my-ui/login';



export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const { colorScheme } = useColorScheme();

  console.log('🔴 RootLayout rendu - hydrated:', hydrated, 'loading:', loading, 'session:', session?.user?.email || 'null');

  useEffect(() => {
    console.log('🟢 useEffect monté');
    let isMounted = true;

    const initialize = async () => {
      console.log('📍 Initialisation - appel getSession()');
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log('📡 getSession() réponse:', { error: error?.message || 'null', session: data.session?.user?.email || 'null' });
        
        if (isMounted) {
          setSession(data.session);
          console.log('✅ Session définie:', data.session?.user?.email || 'null');
        }
      } catch (error) {
        console.error('❌ Exception getSession:', error);
      } finally {
        if (isMounted) {
          console.log('⏱️  setLoading(false)');
          setLoading(false);
          console.log('⏱️  setHydrated(true)');
          setHydrated(true);
        }
      }
    };

    initialize();

    console.log('🔔 Enregistrement onAuthStateChange');
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('🔔 Event reçu:', event, '| Session:', newSession?.user?.email || 'null');
        if (isMounted) {
          console.log('📌 Mise à jour session dans état');
          setSession(newSession);
        }
      }
    );

    return () => {
      console.log('🛑 useEffect cleanup');
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Attendre l'hydratation
  if (!hydrated) {
    console.log('⏳ En attente hydratation...');
    return null;
  }

  // Pendant le chargement, afficher un écran vide
  if (loading) {
    console.log('⏳ En attente chargement...');
    return null;
  }

  // SI PAS CONNECTÉ → affiche un écran de login local
  if (session === null) {
    return <LoginScreen />;
  }

  // CONNECTÉ → Stack normal
  console.log('✅ Session valide - Affichage Stack');
  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack />
      <PortalHost />
    </ThemeProvider>
  );
}