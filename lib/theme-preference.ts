import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEME_STORAGE_KEY = 'theme';

export type AppThemePreference = 'light' | 'dark';

export async function getThemePreference(): Promise<AppThemePreference> {
  return 'light';
}

export async function setThemePreference(theme: AppThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
}
