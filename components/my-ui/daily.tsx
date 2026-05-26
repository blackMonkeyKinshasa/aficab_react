import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { DateField } from '@/components/my-ui/DateField';
import { ModalLocationSelector } from '@/components/my-ui/ModalLocationSelector';
import { ModuleReservation } from '@/components/my-ui/ModuleReservation';
import { Button } from '@/components/ui/button';
import { Location } from '@/constants/constants';
import { ResType } from '@/constants/databaseEnum';
import { LocationDocLOC } from '@/constants/dataInterface';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { useMyStateUser } from '@/store/user-state';

export function Daily() {
  const router = useRouter();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [hasEarlyStartSelection, setHasEarlyStartSelection] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const analytics = useAnalytics();
  const userPhone = useMyStateUser((state) => state.user?.phone?.trim() ?? '');
  const hasLateEndSelection =
    dateEnd !== null &&
    (dateEnd.getHours() > 20 || (dateEnd.getHours() === 20 && dateEnd.getMinutes() > 0));
  const showStandardHoursInfo = hasEarlyStartSelection || hasLateEndSelection;

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

    const doc: LocationDocLOC = {
      type: ResType.LOC,
      location,
      dateStart,
      dateEnd,
    };
    analytics.trackBookingStarted(ResType.LOC, {
      origin: location.description,
      dateStart: dateStart.toISOString(),
      dateEnd: dateEnd.toISOString(),
    });
    router.push({
      pathname: '/new_booking/[doc]',
      params: { doc: JSON.stringify(doc) },
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
    <View style={{ flex: 1, paddingTop: 8 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingTop: 20, paddingBottom: 10, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => setVisible(true)}>
            <ModuleReservation
              icon={'location-outline'}
              title={location ? location.description : t('booking.departure')}
              isDarkMode={isDarkMode}
            />
          </TouchableOpacity>
        </View>

        <View style={{ paddingTop: 10, paddingBottom: 10, paddingHorizontal: 20 }}>
          <DateField
            label={t('booking.startDateTime')}
            value={dateStart}
            minDate={new Date()}
            onChange={handleDateStartChange}
            isStartTime={true}
          />
        </View>

        <View style={{ paddingTop: 10, paddingBottom: 30, paddingHorizontal: 20 }}>
          <DateField
            label={t('booking.endDateTime')}
            value={dateEnd}
            minDate={dateStart && dateStart.getDay() > new Date().getDay() ? dateStart : new Date()}
            onChange={handleDateEndChange}
            isStartTime={false}
          />
        </View>
        {/* button de l'action  */}
        <TouchableOpacity style={{ padding: 20 }}>
          <Button
            disabled={location === null || dateStart === null || dateEnd === null}
            className="mb-6 h-12 rounded-lg bg-orange-500"
            onPress={handleSubmit}>
            <Text className="text-base font-bold text-white">{t('booking.viewOffers')} →</Text>
          </Button>
        </TouchableOpacity>
      </ScrollView>

      <Snackbar
        style={{ marginBottom: 150 }}
        visible={showStandardHoursInfo}
        duration={Snackbar.DURATION_SHORT}
        onDismiss={() => {}}
        action={{
          label: 'OK',
          onPress: () => {
            setHasEarlyStartSelection(false);
          },
        }}>
        {t('booking.standardHoursInfo')}
      </Snackbar>

      {/*fenetre modal pour la selection du lieu*/}
      <ModalLocationSelector
        visible={visible}
        onDismiss={() => setVisible(false)}
        onConfirm={(newLocation) => {
          console.log('Location confirmée:', newLocation.description);
          setLocation(newLocation);
          setVisible(false);
        }}
      />
    </View>
  );
}
