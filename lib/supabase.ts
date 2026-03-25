import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';

const isDev = false;
const supabaseUrl_dev = 'https://sepjdrscnqkcwgqsomnm.supabase.co';
const supabaseUrl_Prod = 'https://zbgzsejuyvtjwmgtigmx.supabase.co';
const supabaseAnonKey_dev =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZ3pzZWp1eXZ0andtZ3RpZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUyOTA0NzEsImV4cCI6MjA0MDg2NjQ3MX0.MIZ-1UVqeel3dxoogCSirPrDhY3AlexWK2diLwMNhGo';
const supabaseAnonKey_Prod =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZ3pzZWp1eXZ0andtZ3RpZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUyOTA0NzEsImV4cCI6MjA0MDg2NjQ3MX0.MIZ-1UVqeel3dxoogCSirPrDhY3AlexWK2diLwMNhGo';

const supabaseUrl = isDev ? supabaseUrl_dev : supabaseUrl_Prod;
const supabaseAnonKey = isDev ? supabaseAnonKey_dev : supabaseAnonKey_Prod;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
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
