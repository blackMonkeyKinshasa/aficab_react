import 'dayjs/locale/en';
import 'dayjs/locale/fr';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import dayjs from 'dayjs';
import DateTimePicker, { DateType } from 'react-native-ui-datepicker';

import { BookingSheetLayout } from '@/components/my-ui/BookingSheetLayout';
import { BookingTimePicker } from '@/components/my-ui/BookingTimePicker';
import { useDatePickerClassNames } from '@/lib/date-picker-theme';
import { useI18n } from '@/lib/i18n';
import { snapMinutesToStep } from '@/lib/time-utils';

const DEFAULT_START_HOUR = 8;
const DEFAULT_START_MINUTE = 0;

type SelectorStep = 'date' | 'time';

export function formatBookingDateTime(date: Date | null, locale: string) {
  if (!date) return '';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDate(value: DateType): Date | null {
  if (value == null) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.toDate() : null;
}

function getInitialDate(value: Date | null | undefined, minDate: Date | undefined) {
  if (value) return new Date(value);
  if (minDate) return new Date(minDate);
  return new Date();
}

function getInitialHours(value: Date | null | undefined, isStartTime: boolean) {
  if (value) return value.getHours();
  if (isStartTime) return DEFAULT_START_HOUR;
  return new Date().getHours();
}

function getInitialMinutes(value: Date | null | undefined, isStartTime: boolean) {
  if (value) return snapMinutesToStep(value.getMinutes());
  if (isStartTime) return DEFAULT_START_MINUTE;
  return snapMinutesToStep(new Date().getMinutes());
}

export function ModalDateSelector({
  visible,
  onDismiss,
  onConfirm,
  value = null,
  minDate,
  isStartTime = false,
}: {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (date: Date) => void;
  value?: Date | null;
  minDate?: Date;
  isStartTime?: boolean;
}) {
  const { t, language } = useI18n();
  const classNames = useDatePickerClassNames();

  const [step, setStep] = useState<SelectorStep>('date');
  const [draftDate, setDraftDate] = useState<Date | undefined>(undefined);
  const [draftHours, setDraftHours] = useState(DEFAULT_START_HOUR);
  const [draftMinutes, setDraftMinutes] = useState(DEFAULT_START_MINUTE);

  useEffect(() => {
    if (!visible) return;

    setStep('date');
    setDraftDate(getInitialDate(value, minDate));
    setDraftHours(getInitialHours(value, isStartTime));
    setDraftMinutes(getInitialMinutes(value, isStartTime));
  }, [visible, value, minDate, isStartTime]);

  const handleSave = useCallback(() => {
    if (!draftDate) return;

    const finalDate = new Date(draftDate);
    finalDate.setHours(draftHours, draftMinutes, 0, 0);
    onConfirm(finalDate);
  }, [draftDate, draftHours, draftMinutes, onConfirm]);

  const handleTimeChange = useCallback((nextDate: Date) => {
    setDraftHours(nextDate.getHours());
    setDraftMinutes(nextDate.getMinutes());
  }, []);

  const handleDateStepChange = useCallback(({ date }: { date: DateType }) => {
    const nextDate = toDate(date);
    if (!nextDate) return;

    setDraftDate(nextDate);
    setStep('time');
  }, []);

  const canSave = step === 'time' && draftDate !== undefined;

  const draftDateTime = useMemo(() => {
    const baseDate = draftDate ? new Date(draftDate) : new Date();
    baseDate.setHours(draftHours, draftMinutes, 0, 0);
    return baseDate;
  }, [draftDate, draftHours, draftMinutes]);

  const footerActions = useMemo(() => {
    if (step === 'time') {
      return [
        {
          label: t('booking.back'),
          onPress: () => setStep('date'),
          variant: 'outline' as const,
        },
        {
          label: t('common.save'),
          onPress: handleSave,
          disabled: !canSave,
        },
      ];
    }

    return [
      {
        label: t('common.cancel'),
        onPress: onDismiss,
        variant: 'outline' as const,
      },
    ];
  }, [canSave, handleSave, onDismiss, step, t]);

  const sheetTitle = step === 'date' ? t('booking.chooseDate') : t('booking.selectTime');

  return (
    <BookingSheetLayout
      visible={visible}
      onDismiss={onDismiss}
      title={sheetTitle}
      footerActions={footerActions}
      snapPoints={[65]}>
      <View className="w-full flex-1 pt-2">
        {step === 'date' ? (
          <DateTimePicker
            mode="single"
            date={draftDate}
            minDate={minDate}
            locale={language}
            timePicker={false}
            classNames={classNames}
            onChange={handleDateStepChange}
          />
        ) : (
          <BookingTimePicker value={draftDateTime} onChange={handleTimeChange} />
        )}
      </View>
    </BookingSheetLayout>
  );
}
