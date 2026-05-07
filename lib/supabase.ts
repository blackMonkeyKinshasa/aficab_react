import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { isDev } from '@/constants/env';

const SUPABASE_URL_DEV = 'https://sepjdrscnqkcwgqsomnm.supabase.co';
const SUPABASE_URL_PROD = 'https://zbgzsejuyvtjwmgtigmx.supabase.co';
const SUPABASE_ANON_KEY_DEV = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcGpkcnNjbnFrY3dncXNvbW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjU3ODgsImV4cCI6MjA2ODAwMTc4OH0.4dHp_aV6X7CelavFBaty5-2qTtGswsjsX4QActqSYtE';
const SUPABASE_ANON_KEY_PROD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZ3pzZWp1eXZ0andtZ3RpZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUyOTA0NzEsImV4cCI6MjA0MDg2NjQ3MX0.MIZ-1UVqeel3dxoogCSirPrDhY3AlexWK2diLwMNhGo';

const supabaseUrl = isDev ? SUPABASE_URL_DEV : SUPABASE_URL_PROD;
const supabaseAnonKey = isDev ? SUPABASE_ANON_KEY_DEV : SUPABASE_ANON_KEY_PROD;

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
