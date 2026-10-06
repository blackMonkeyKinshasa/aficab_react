import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';

import { useColorScheme } from 'nativewind';
import { formatBookingDateTime, ModalDateSelector } from '@/components/my-ui/ModalDateSelector';
import { getEarliestBookingDate } from '@/lib/time-utils';
import { ModalLocationSelector } from '@/components/my-ui/ModalLocationSelector';
import { ModuleReservation } from '@/components/my-ui/ModuleReservation';
import { Button, ButtonText } from '@/components/ui/button';
import { Location } from '@/constants/constants';
import { ResType } from '@/constants/databaseEnum';
import { bookingSpacing } from '@/constants/spacing';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { getAddressName } from '@/lib/location-utils';
import { useAppToast } from '@/lib/toast';
import { useMyStateUser } from '@/store/user-state';

type UserStoreState = ReturnType<typeof useMyStateUser.getState>;

export function Daily() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { appLocale, t } = useI18n();
  const toast = useAppToast();
  const [visible, setVisible] = useState(false);
  const [visibleDateStart, setVisibleDateStart] = useState(false);
  const [visibleDateEnd, setVisibleDateEnd] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [hasEarlyStartSelection, setHasEarlyStartSelection] = useState(false);
  const analytics = useAnalytics();
  const userPhone = useMyStateUser((state: UserStoreState) => state.user?.phone?.trim() ?? '');
  const hasLateEndSelection =
    dateEnd !== null &&
    (dateEnd.getHours() > 20 || (dateEnd.getHours() === 20 && dateEnd.getMinutes() > 0));
  const showStandardHoursInfo = hasEarlyStartSelection || hasLateEndSelection;
  const lastStandardHoursToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showStandardHoursInfo) {
      lastStandardHoursToastKeyRef.current = null;
      return;
    }

    const toastKey = `${hasEarlyStartSelection}-${hasLateEndSelection}`;

    if (lastStandardHoursToastKeyRef.current === toastKey) {
      return;
    }

    lastStandardHoursToastKeyRef.current = toastKey;
    toast({
      description: t('booking.standardHoursInfo'),
      action: 'info',
      duration: 3500,
    });
  }, [hasEarlyStartSelection, hasLateEndSelection, showStandardHoursInfo, t, toast]);

  const handleSubmit = () => {
    if (!location || !dateStart || !dateEnd) return;

    if (!userPhone) {
      Alert.alert(t('booking.phoneRequiredTitle'), t('booking.phoneRequiredMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('booking.addNow'),
          onPress: () =>
            router.push({
              pathname: '/edit-profile',
              params: { focusField: 'phone', returnToBooking: '1' },
            }),
        },
      ]);
      return;
    }

    analytics.trackBookingStarted(ResType.LOC, {
      origin: location.description,
      dateStart: dateStart.toISOString(),
      dateEnd: dateEnd.toISOString(),
    });
    router.push({
      pathname: '/new_booking/[doc]',
      params: { doc: ResType.LOC },
    });
  };

  const handleDateStartChange = (date: Date | null) => {
    if (!date) {
      setDateStart(null);
      setHasEarlyStartSelection(false);
      return;
    }
    const minHour = new Date(date);
    minHour.setHours(8, 0, 0, 0);
    setHasEarlyStartSelection(date < minHour);
    const validStart = date < minHour ? minHour : date;
    setDateStart(validStart);

    const end = new Date(validStart);
    end.setHours(20, 0, 0, 0);
    setDateEnd(end);
  };

  const handleDateEndChange = (date: Date | null) => {
    setDateEnd(date);
  };

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bookingSpacing.scrollPaddingBottom }}
        showsVerticalScrollIndicator={false}>
        <View className="mb-4 gap-4 px-5">
          <ModuleReservation
            icon={'location-outline'}
            title={getAddressName(location?.description)}
            placeholder={t('booking.departure')}
            onPress={() => setVisible(true)}
            isDarkMode={isDark}
          />

          <ModuleReservation
            icon={'calendar-outline'}
            title={dateStart ? formatBookingDateTime(dateStart, appLocale) : ''}
            placeholder={t('booking.startDateTime')}
            onPress={() => setVisibleDateStart(true)}
            isDarkMode={isDark}
          />

          <ModuleReservation
            icon={'calendar-outline'}
            title={dateEnd ? formatBookingDateTime(dateEnd, appLocale) : ''}
            placeholder={t('booking.endDateTime')}
            onPress={() => setVisibleDateEnd(true)}
            isDarkMode={isDark}
          />
        </View>

        <TouchableOpacity className="px-5 mt-4">
          <Button
            action="primary"
            variant="solid"
            size="control"
            isDisabled={location === null || dateStart === null || dateEnd === null}
            className="w-full rounded-md"
            style={{ marginBottom: bookingSpacing.buttonMarginBottom }}
            onPress={handleSubmit}>
            <ButtonText className="text-white">{t('booking.viewOffers')} →</ButtonText>
          </Button>
        </TouchableOpacity>
      </ScrollView>

      <ModalLocationSelector
        visible={visible}
        onDismiss={() => setVisible(false)}
        onConfirm={(newLocation) => {
          setLocation(newLocation);
          setVisible(false);
        }}
      />

      <ModalDateSelector
        visible={visibleDateStart}
        onDismiss={() => setVisibleDateStart(false)}
        onConfirm={(date) => {
          handleDateStartChange(date);
          setVisibleDateStart(false);
        }}
        value={dateStart}
        minDate={getEarliestBookingDate()}
        isStartTime={true}
      />

      <ModalDateSelector
        visible={visibleDateEnd}
        onDismiss={() => setVisibleDateEnd(false)}
        onConfirm={(date) => {
          handleDateEndChange(date);
          setVisibleDateEnd(false);
        }}
        value={dateEnd}
        minDate={dateStart ?? getEarliestBookingDate()}
        isStartTime={false}
      />
    </View>
  );
}
