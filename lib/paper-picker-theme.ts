import { useMemo } from 'react';

import { useColorScheme } from 'nativewind';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import { color } from '@/constants/colors';

export function usePaperPickerTheme() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: color.primary,
        onPrimary: color.white,
        primaryContainer: isDark ? 'rgba(255, 87, 5, 0.2)' : '#FFE9D5',
        onPrimaryContainer: color.primary,
        secondaryContainer: isDark ? 'rgba(255, 87, 5, 0.2)' : '#FFE9D5',
        surfaceVariant: isDark ? '#414040' : '#F2F3F7',
        onSurface: isDark ? '#F5F5F5' : '#262627',
        outline: isDark ? '#525252' : '#D4D4D4',
        background: isDark ? color.appDarkBackground : color.white,
        surface: isDark ? color.appDarkBackground : color.white,
      },
    };
  }, [isDark]);
}
