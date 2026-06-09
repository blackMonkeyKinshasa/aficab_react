import { useMemo } from 'react';

import { useColorScheme } from 'nativewind';
import { useDefaultClassNames } from 'react-native-ui-datepicker';

export function useDatePickerClassNames() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const defaultClassNames = useDefaultClassNames();

  return useMemo(
    () => ({
      ...defaultClassNames,
      day_cell: 'p-1',
      day_label: isDark ? 'text-typography-0 font-normal' : 'text-typography-900 font-normal',
      month_selector_label: isDark
        ? 'font-semibold text-lg text-typography-0'
        : 'font-semibold text-lg text-typography-900',
      year_selector_label: isDark
        ? 'font-semibold text-lg text-typography-0'
        : 'font-semibold text-lg text-typography-900',
      weekday_label: isDark
        ? 'text-sm uppercase text-typography-400'
        : 'text-sm uppercase text-typography-500',
      time_label: isDark
        ? 'text-typography-0 text-3xl font-semibold tabular-nums'
        : 'text-typography-900 text-3xl font-semibold tabular-nums',
      time_selected_indicator: isDark
        ? 'bg-primary-500/15 rounded-xl border border-primary-500/30'
        : 'bg-primary-100 rounded-xl border border-primary-200',
      selected: 'group bg-primary-500 rounded-md active:opacity-90',
      selected_label: 'text-white font-medium',
      today: 'border border-primary-500 text-red-600 rounded-md',
      today_label: isDark ? 'text-typography-0' : 'text-typography-900',
    }),
    [defaultClassNames, isDark]
  );
}
