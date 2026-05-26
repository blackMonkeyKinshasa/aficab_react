import React, { useState } from 'react';
import { TouchableOpacity, useColorScheme, View } from 'react-native';

import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';

import { useI18n } from '@/lib/i18n';

import { ModuleReservation } from './ModuleReservation';

type Props = {
  label?: string;
  value?: Date | null;
  departureHour?: number;
  minDate?: Date;
  isStartTime?: boolean;
  onChange?: (date: Date) => void;
};

export function DateField({
  departureHour: _departureHour,
  label,
  value = null,
  minDate,
  onChange,
  isStartTime = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(value);
  const [visible, setVisible] = React.useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const { appLocale, paperDateLocale, t } = useI18n();
  const resolvedLabel = label ?? t('booking.chooseDate');
  const myDepartureHour = 8;
  const myDepartureMinutes = 0;

  const onConfirm = ({ date }: { date: Date | undefined }) => {
    setOpen(false);

    if (date) {
      setDate(date);
    }
    setVisible(true);
  };

  const onDateChange = ({ date: selectedDate }: { date: Date | undefined }) => {
    if (selectedDate) {
      setOpen(false);
      setDate(selectedDate);
      setVisible(true);
    }
  };
  const onDismiss = React.useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  const onConfirmTime = React.useCallback(
    ({ hours, minutes }: { hours: number; minutes: number }) => {
      setVisible(false);

      if (!date) return;

      const newDate = new Date(date);

      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      newDate.setSeconds(0);

      setDate(newDate);
      onChange?.(newDate);

      console.log('Date complète :', newDate);
    },
    [date, onChange]
  );

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString(appLocale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)}>
        <ModuleReservation
          icon={'calendar-outline'}
          title={value ? formatDate(value) : resolvedLabel}
          isDarkMode={isDarkMode}
        />
      </TouchableOpacity>

      <TimePickerModal
        visible={visible}
        onDismiss={onDismiss}
        onConfirm={onConfirmTime}
        hours={isStartTime ? myDepartureHour : value?.getHours()}
        minutes={isStartTime ? myDepartureMinutes : value?.getMinutes()}
        locale={paperDateLocale}
        label={t('booking.selectTime')}
      />
      <DatePickerModal
        locale={paperDateLocale}
        mode="single"
        visible={open}
        onDismiss={() => setOpen(false)}
        date={minDate || date || new Date()}
        presentationStyle="formSheet"
        validRange={minDate ? { startDate: minDate } : undefined}
        onConfirm={onConfirm}
        onChange={onDateChange}
      />
    </View>
  );
}
