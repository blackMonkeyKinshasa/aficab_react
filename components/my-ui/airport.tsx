import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { formatBookingDateTime, ModalDateSelector } from '@/components/my-ui/ModalDateSelector';
import { ModalLocationSelector } from '@/components/my-ui/ModalLocationSelector';
import { ModuleReservation } from '@/components/my-ui/ModuleReservation';
import { Button, ButtonText } from '@/components/ui/button';
import { color } from '@/constants/colors';
import { Location } from '@/constants/constants';
import { ResType } from '@/constants/databaseEnum';
import { LocationDocTA } from '@/constants/dataInterface';
import { bookingSpacing } from '@/constants/spacing';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { useMyStateUser } from '@/store/user-state';

type TripType = 'one-way' | 'round-trip';

const TripOption = ({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: TripType;
  selected: TripType;
  onSelect: (v: TripType) => void;
}) => {
  const isSelected = selected === value;
  return (
    <TouchableOpacity
      className="flex-1 flex-row items-center justify-center"
      onPress={() => onSelect(value)}
      activeOpacity={0.7}>
      <View
        className="mr-2 h-[22px] w-[22px] items-center justify-center rounded-full border-2"
        style={{
          borderColor: color.primary,
          backgroundColor: isSelected ? color.primary : 'transparent',
        }}>
        {isSelected ? <Text className="text-sm font-bold text-white">✓</Text> : null}
      </View>
      <Text className="text-typography-900 text-base">{label}</Text>
    </TouchableOpacity>
  );
};

const AIRPORT_KEYWORDS = [
  'aéroport',
  'aeroport',
  'airport',
  'charles de gaulle',
  'cdg',
  'orly',
  'roissy',
  'beauvais',
  'le bourget',
];

function containsAirport(location: Location | null): boolean {
  if (!location) return false;
  const desc = location.description.toLowerCase();
  return AIRPORT_KEYWORDS.some((kw) => desc.includes(kw));
}

export function Airport() {
  const router = useRouter();
  const { appLocale, t } = useI18n();
  const [tripType, setTripType] = useState<TripType>('one-way');
  const [locationDepart, setLocationDepart] = useState<Location | null>(null);
  const [locationDest, setLocationDest] = useState<Location | null>(null);
  const [visibleDepart, setVisibleDepart] = useState(false);
  const [visibleDest, setVisibleDest] = useState(false);
  const [visibleDateStart, setVisibleDateStart] = useState(false);
  const [visibleDateReturn, setVisibleDateReturn] = useState(false);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateReturn, setDateReturn] = useState<Date | null>(null);
  const analytics = useAnalytics();
  const userPhone = useMyStateUser((state) => state.user?.phone?.trim() ?? '');

  const handleSubmit = () => {
    if (!locationDepart || !locationDest || !dateStart) return;

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

    const doc: LocationDocTA = {
      type: ResType.TA,
      tripType,
      locationDepart,
      locationDest,
      dateStart,
      ...(tripType === 'round-trip' && dateReturn ? { dateReturn } : {}),
    };
    analytics.trackBookingStarted(ResType.TA, {
      origin: locationDepart.description,
      destination: locationDest.description,
      dateStart: dateStart.toISOString(),
      dateEnd: dateReturn?.toISOString(),
      tripType,
    });
    router.push({
      pathname: '/new_booking/[doc]',
      params: { doc: JSON.stringify(doc) },
    });
  };

  const handleDateStartChange = (date: Date) => {
    setDateStart(date);
    if (dateReturn && date > dateReturn) {
      setDateReturn(null);
    }
  };

  const airportError =
    locationDepart !== null &&
    locationDest !== null &&
    !containsAirport(locationDepart) &&
    !containsAirport(locationDest)
      ? t('booking.airportRequired')
      : null;

  const isValid =
    locationDepart !== null &&
    locationDest !== null &&
    dateStart !== null &&
    (tripType === 'one-way' || dateReturn !== null) &&
    airportError === null;

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bookingSpacing.scrollPaddingBottom }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-row px-5" style={{ marginBottom: bookingSpacing.sectionGap }}>
          <TripOption
            label={t('booking.oneWay')}
            value="one-way"
            selected={tripType}
            onSelect={setTripType}
          />
          <TripOption
            label={t('booking.roundTrip')}
            value="round-trip"
            selected={tripType}
            onSelect={setTripType}
          />
        </View>

        <View className="gap-3 px-5">
          <ModuleReservation
            icon={'location-outline'}
            title={locationDepart?.description ?? ''}
            placeholder={t('booking.departure')}
            onPress={() => setVisibleDepart(true)}
          />

          <ModuleReservation
            icon={'navigate-outline'}
            title={locationDest?.description ?? ''}
            placeholder={t('booking.destination')}
            onPress={() => setVisibleDest(true)}
          />

          {airportError ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="warning-outline" size={16} color="#ef4444" />
              <Text className="text-error-500 flex-1 text-sm">{airportError}</Text>
            </View>
          ) : null}

          <ModuleReservation
            icon={'calendar-outline'}
            title={dateStart ? formatBookingDateTime(dateStart, appLocale) : ''}
            placeholder={t('booking.departureDateTime')}
            onPress={() => setVisibleDateStart(true)}
          />

          {tripType === 'round-trip' ? (
            <ModuleReservation
              icon={'calendar-outline'}
              title={dateReturn ? formatBookingDateTime(dateReturn, appLocale) : ''}
              placeholder={t('booking.returnDateTime')}
              onPress={() => setVisibleDateReturn(true)}
            />
          ) : null}
        </View>

        <TouchableOpacity className="mt-4 px-5" disabled={!isValid}>
          <Button
            action="primary"
            variant="solid"
            size="control"
            isDisabled={!isValid}
            className="w-full rounded-md"
            style={{ marginBottom: bookingSpacing.buttonMarginBottom }}
            onPress={handleSubmit}>
            <ButtonText>{t('booking.viewOffers')}</ButtonText>
          </Button>
        </TouchableOpacity>
      </ScrollView>

      <ModalLocationSelector
        visible={visibleDepart}
        onDismiss={() => setVisibleDepart(false)}
        onConfirm={(loc) => {
          setLocationDepart(loc);
          setVisibleDepart(false);
        }}
      />

      <ModalLocationSelector
        visible={visibleDest}
        onDismiss={() => setVisibleDest(false)}
        onConfirm={(loc) => {
          setLocationDest(loc);
          setVisibleDest(false);
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
        minDate={new Date()}
        isStartTime
      />

      <ModalDateSelector
        visible={visibleDateReturn}
        onDismiss={() => setVisibleDateReturn(false)}
        onConfirm={(date) => {
          setDateReturn(date);
          setVisibleDateReturn(false);
        }}
        value={dateReturn}
        minDate={dateStart ?? new Date()}
        isStartTime={false}
      />
    </View>
  );
}
