import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { isDev } from '@/constants/env';

function getRequiredEnv(name: 'EXPO_PUBLIC_SUPABASE_URL_DEV' | 'EXPO_PUBLIC_SUPABASE_URL_PROD' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY_DEV' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD') {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const supabaseUrl = isDev
  ? getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL_DEV')
  : getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL_PROD');
const supabaseAnonKey = isDev
  ? getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY_DEV')
  : getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
