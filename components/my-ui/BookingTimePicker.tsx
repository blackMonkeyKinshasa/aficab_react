import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Provider as PaperProvider } from 'react-native-paper';
import { TimePicker } from 'react-native-paper-dates';

import { useI18n } from '@/lib/i18n';
import { usePaperPickerTheme } from '@/lib/paper-picker-theme';
import { snapMinutesToStep } from '@/lib/time-utils';

type PossibleClockTypes = 'hours' | 'minutes';

const inputTypes = {
  picker: 'picker' as const,
};

const clockTypes = {
  hours: 'hours' as const,
  minutes: 'minutes' as const,
};

export interface BookingTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  use12Hours?: boolean;
}

export function BookingTimePicker({ value, onChange, use12Hours = false }: BookingTimePickerProps) {
  const theme = usePaperPickerTheme();
  const { paperDateLocale } = useI18n();
  const [focused, setFocused] = useState<PossibleClockTypes>(clockTypes.hours);

  const snappedMinutes = snapMinutesToStep(value.getMinutes());

  const handleChange = useCallback(
    (params: { hours: number; minutes: number; focused?: PossibleClockTypes }) => {
      if (params.focused) {
        setFocused(params.focused);
      }

      const nextDate = new Date(value);
      nextDate.setHours(params.hours, snapMinutesToStep(params.minutes), 0, 0);
      onChange(nextDate);
    },
    [onChange, value]
  );

  return (
    <PaperProvider theme={theme}>
      <View className="w-full items-center justify-center py-4" style={{ minHeight: 320 }}>
        <TimePicker
          locale={paperDateLocale}
          inputType={inputTypes.picker}
          focused={focused}
          hours={value.getHours()}
          minutes={snappedMinutes}
          onFocusInput={setFocused}
          onChange={handleChange}
          use24HourClock={!use12Hours}
          inputFontSize={52}
        />
      </View>
    </PaperProvider>
  );
}
