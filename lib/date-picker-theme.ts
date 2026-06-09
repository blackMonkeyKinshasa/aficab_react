import { useMemo } from 'react';

import { useDefaultClassNames } from 'react-native-ui-datepicker';

export function useDatePickerClassNames() {
  const defaultClassNames = useDefaultClassNames();

  return useMemo(
    () => ({
      ...defaultClassNames,
      day_cell: 'p-1',
      day_label: 'text-foreground font-normal',
      month_selector_label: 'font-semibold text-lg text-foreground',
      year_selector_label: 'font-semibold text-lg text-foreground',
      weekday_label: 'text-sm uppercase text-muted-foreground',
      time_label: 'text-foreground text-3xl font-semibold tabular-nums',
      time_selected_indicator: 'bg-muted rounded-xl border border-border',
      selected: 'group bg-primary rounded-md active:opacity-90',
      selected_label: 'text-primary-foreground font-medium',
      today: 'bg-accent rounded-md',
      today_label: 'text-accent-foreground',
    }),
    [defaultClassNames]
  );
}
