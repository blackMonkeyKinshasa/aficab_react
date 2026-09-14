import { useMemo } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Clock, Plane, CarFront, PackageOpen } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/my-ui/Avatar';
import { useBookings } from '@/hooks/queries/useBookings';
import { fmtDay, getCurrentRentalDay, getRentalDays, isMultiDayRental } from '@/components/reservation/reservation-helpers';
import { color } from '@/constants/colors';
import { ResStatus, ResType } from '@/constants/databaseEnum';
import { Booking } from '@/constants/dataInterface';
import { TranslationKey, useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { POLLING } from '@/lib/query/polling';
import { useMyStateUser } from '@/store/user-state';

type UserStoreState = ReturnType<typeof useMyStateUser.getState>;
type RideType = 'daily' | 'airport';

const UPCOMING_STATUSES: ResStatus[] = [
  ResStatus.PENDING,
  ResStatus.PENDINGDRIVER,
  ResStatus.CONFIRMED,
  ResStatus.STARTED,
];

const STATUS_LABELS: Record<ResStatus, TranslationKey> = {
  [ResStatus.PENDING]: 'reservations.status.pending',
  [ResStatus.PENDINGDRIVER]: 'reservations.status.pendingDriver',
  [ResStatus.CONFIRMED]: 'reservations.status.confirmed',
  [ResStatus.STARTED]: 'reservations.status.started',
  [ResStatus.ENDED]: 'reservations.status.ended',
  [ResStatus.CANCELED]: 'reservations.status.canceled',
  [ResStatus.ARCHIVED]: 'reservations.status.archived',
};

const STATUS_COLORS: Record<ResStatus, string> = {
  [ResStatus.PENDING]: '#F59E0B',
  [ResStatus.PENDINGDRIVER]: '#F59E0B',
  [ResStatus.CONFIRMED]: '#16A34A',
  [ResStatus.STARTED]: '#7C3AED',
  [ResStatus.ENDED]: '#4CAF50',
  [ResStatus.CANCELED]: '#F44336',
  [ResStatus.ARCHIVED]: '#9E9E9E',
};

function getFirstName(fullName: string | null | undefined) {
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName || '';
}

function formatReservationDate(iso: string | null | undefined, locale: string) {
  if (!iso) {
    return '—';
  }

  const date = new Date(iso);
  const day = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return locale.startsWith('fr') ? `${day} à ${time}` : `${day} at ${time}`;
}

function formatNextBookingSubtitle(
  booking: Booking,
  locale: string,
  tf: (key: TranslationKey, values: Record<string, string | number | undefined>) => string
) {
  if (!isMultiDayRental(booking)) {
    return formatReservationDate(booking.departureAt, locale);
  }

  const rentalDays = getRentalDays(booking);

  if (booking.status === ResStatus.STARTED) {
    return tf('reservations.rentalDayProgress', {
      current: getCurrentRentalDay(booking, rentalDays),
      total: rentalDays,
    });
  }

  return tf('reservations.rentalFromTo', {
    start: fmtDay(booking.departureAt, locale),
    end: fmtDay(booking.arrivalAt, locale),
  });
}

function getReservationRouteDeparture(booking: Booking) {
  const departure = booking.departure?.label?.trim();
  const arrival = booking.arrival?.label?.trim();

  if (departure && arrival) {
    return `${departure} - ${arrival}`;
  }

  return departure || arrival || '—';
}

export function MainLayout() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t, tf, appLocale, language } = useI18n();
  const isFrench = language === 'fr';  
  const storedUser = useMyStateUser((state: UserStoreState) => state.user);
  const { data: bookings = [], isLoading: loadingBooking } = useBookings(storedUser?.id, {
    pollingInterval: POLLING.normal,
  });
  const nextBooking = useMemo(() => {
    return bookings
      .filter((booking) => UPCOMING_STATUSES.includes(booking.status))
      .sort(
        (left, right) =>
          new Date(left.departureAt).getTime() - new Date(right.departureAt).getTime()
      )[0] ?? null;
  }, [bookings]);

  const firstName = getFirstName(storedUser?.full_name);
  const greeting = firstName
    ? tf('home.greeting', { name: firstName })
    : t('home.greetingFallback');
  const fg = isDark ? '#ffffff' : '#111827';
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const cardBg = isDark ? '#1E1E1E' : '#ffffff';
  const pageBg = isDark ? color.appDarkBackground : '#F7F7F8';
  const borderColor = isDark ? '#2F2F2F' : '#E5E7EB';
  const { s, ms, imageHeight, font } = useLayoutScale();
  const bannerHeight = imageHeight(180);
  const iconSize = s(22);
  const iconWell = s(44);

  function setSelectedRideType(type: RideType) {
    router.push({
      pathname: '/new_booking/[doc]',
      params: { doc: type === 'airport' ? ResType.TA : ResType.LOC },
    });
  }

  const serviceCards = [
      {
        type: 'airport' as const,
        title: t('home.airportTitle'),
        subtitle: t('home.airportSubtitle'),
        icon: Plane,
        image: isFrench? require('@/assets/main-layout/ta-fr.jpeg') : require('@/assets/main-layout/ta-en.jpeg'),
      },
      {
        type: 'daily' as const,
        title: t('home.dailyTitle'),
        subtitle: t('home.dailySubtitle'),
        icon: Clock,
        image: isFrench? require('@/assets/main-layout/loc-fr.jpeg') : require('@/assets/main-layout/loc-en.jpeg'),
    },
    ];

  return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}>
      
        <View className="mb-6 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text
              className="font-bold"
              style={{ color: fg, fontSize: font.xl, lineHeight: ms(32) }}>
              {greeting}
            </Text>
            <Text className="mt-1 font-normal" style={{ color: sub, fontSize: font.base }}>
              {t('home.subtitle')}
            </Text>
          </View>

     { /*    <View className="">
              <Avatar uri={storedUser?.avatar_url ?? ''} size={35} borderRadius={30} isDark={isDark} />
            </View>*/}
        
        </View>

    <View className="flex-1 gap-4">
    <TouchableOpacity
            activeOpacity={0.88}
                onPress={() => setSelectedRideType('airport')}
                className="  mb-3"
                style={{
                  backgroundColor: cardBg,
                  borderColor,
                }}>
                <View className="flex-1 flex-row">
                  <Image
                    source={isFrench ? require('@/assets/main-layout/ta-fr.jpeg') : require('@/assets/main-layout/ta-en.jpeg')}
                    className="w-full rounded-xl"
                    style={{ height: bannerHeight }}
                    resizeMode="cover"
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
               activeOpacity={0.88}
                onPress={() => setSelectedRideType(serviceCards[1].type)}
                className="mb-3"
                style={{
                  backgroundColor: cardBg,
                  borderColor,
                }}>
                <View className="flex-1 flex-row">
                  <Image
                    source={serviceCards[1].image}
                    className="w-full rounded-xl"
                    style={{ height: bannerHeight }}
                    resizeMode="cover"
                  />
                </View>
              </TouchableOpacity>
        </View>

        <View className="mt-8">
          <Text className="mb-3 font-black" style={{ fontSize: font.lg }}>
            {t('home.nextReservation')}
          </Text>

          {loadingBooking ? (
            <View
              className="items-center justify-center rounded-2xl py-8"
              style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}>
              <ActivityIndicator color={color.primary} />
            </View>
          ) : nextBooking ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/booking/[id]',
                  params: { id: nextBooking.id },
                })
              }
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}>
              <View className="flex-row items-center justify-between gap-3">
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDark ? '#3D241C' : '#FFE8DC',
                    width: iconWell,
                    height: iconWell,
                  }}>
                  {nextBooking.type === ResType.TA ? (
                    <Plane size={iconSize} color={color.primary} strokeWidth={2.2} />
                  ) : (
                    <CarFront size={iconSize} color={color.primary} strokeWidth={2.2} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-bold" style={{ color: fg, fontSize: font.base }} numberOfLines={1}>
                    {nextBooking.type === ResType.TA
                      ? t('home.airportTitle')
                      : t('booking.dailyTab')}
                  </Text>
                  <Text className="mt-1" style={{ color: sub, fontSize: font.sm }} numberOfLines={2}>
                    {formatNextBookingSubtitle(nextBooking, appLocale, tf)}
                  </Text>
                </View>
                <View
                  className="rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: STATUS_COLORS[nextBooking.status] ?? color.primary,
                  }}>
                  <Text className="font-bold text-white" style={{ fontSize: font.xs }}>
                    {t(STATUS_LABELS[nextBooking.status] ?? 'reservations.status.pending')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/reservation')}
              className="rounded-2xl px-4 py-5"
              style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}>
              <View className="flex-row items-center gap-3">
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDark ? '#3D241C' : '#FFE8DC',
                    width: iconWell,
                    height: iconWell,
                  }}>
                  <PackageOpen size={iconSize} color={color.primary} strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold" style={{ color: fg, fontSize: font.base }}>
                    {t('home.noReservation')}
                  </Text>
                  <Text className="mt-1" style={{ color: sub, fontSize: font.sm }}>
                    {t('home.seeBookings')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
   );
}
