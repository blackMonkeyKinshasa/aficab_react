import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEME_STORAGE_KEY = 'theme';

export type AppThemePreference = 'light' | 'dark';

export async function getThemePreference(): Promise<AppThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);

    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Fall through to default light theme.
  }

  return 'light';
}

export async function setThemePreference(theme: AppThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
}
