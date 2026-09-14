import { Image, ScrollView, StatusBar, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color } from '@/constants/colors';
import type { Booking } from '@/constants/dataInterface';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

type Props = {
  userName?: string;
  email?: string;
  booking?: Booking;
  onPressMyBookings?: () => void;
  onPressContact?: () => void;
};

function getRentalDays(booking?: Booking) {
  if (!booking?.departureAt || !booking.arrivalAt) return 1;
  const start = new Date(booking.departureAt).getTime();
  const end = new Date(booking.arrivalAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.ceil((end - start) / 86_400_000));
}

export function ReservationConfirmedScreen({
  booking,
  onPressMyBookings,
  onPressContact,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const { t, appLocale } = useI18n();
  const { s, font } = useLayoutScale();
  const fg = isDark ? '#FFFFFF' : '#111827';
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const border = isDark ? '#2F2F2F' : '#E5E7EB';
  const rentalDays = getRentalDays(booking);
  const start = booking?.departureAt ? new Date(booking.departureAt) : null;
  const end = booking?.arrivalAt ? new Date(booking.arrivalAt) : null;
  const period =
    start && end
      ? `${start.toLocaleDateString(appLocale, {
          day: '2-digit',
          month: 'short',
        })} – ${end.toLocaleDateString(appLocale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`
      : '—';
  const rawCarImage = booking?.car?.images?.[0];
  const carImage = typeof rawCarImage === 'string' ? rawCarImage : null;

  const DetailRow = ({
    icon,
    label,
    value,
  }: {
    icon: 'wallet-outline' | 'receipt-outline';
    label: string;
    value: string;
  }) => (
    <View className="flex-row items-center py-3">
      <View
        className="items-center justify-center rounded-full"
        style={{ width: s(42), height: s(42), backgroundColor: isDark ? '#3D241C' : '#FFF1EA' }}>
        <Ionicons name={icon} size={s(20)} color={color.primary} />
      </View>
      <View className="ml-3 flex-1">
        <Text style={{ color: sub, fontSize: font.sm }}>{label}</Text>
        <Text className="mt-0.5 font-bold" style={{ color: fg, fontSize: font.base }}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? color.appDarkBackground : '#F7F7F8' }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <View
            className="items-center justify-center rounded-full"
            style={{ width: s(96), height: s(96), backgroundColor: isDark ? '#123C2A' : '#DDF8E8' }}>
            <View
              className="items-center justify-center rounded-full bg-emerald-500"
              style={{ width: s(68), height: s(68) }}>
              <Ionicons name="checkmark" size={s(38)} color="#FFFFFF" />
            </View>
          </View>
          <Text className="mt-5 text-center font-bold" style={{ color: fg, fontSize: font.xl }}>
            {t('confirmation.title')}
          </Text>
          <Text className="mt-2 text-center" style={{ color: sub, fontSize: font.sm }}>
            {t('confirmation.paymentReceived')}
          </Text>
        </View>

        <View
          className="mt-6 rounded-2xl border p-4"
          style={{ backgroundColor: cardBg, borderColor: border }}>
          <View className="flex-row items-center">
            <View className="items-center justify-center" style={{ width: s(145), height: s(100) }}>
              {carImage ? (
                <Image source={{ uri: carImage }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              ) : (
                <Ionicons name="car-sport-outline" size={s(56)} color={sub} />
              )}
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text className="font-bold" style={{ color: fg, fontSize: font.base }} numberOfLines={2}>
                {booking?.car?.name ?? t('booking.vehicleUnknown')}
              </Text>
              <View className="mt-3 flex-row items-center">
                <Ionicons name="calendar-outline" size={s(17)} color={sub} />
                <Text className="ml-2 flex-1" style={{ color: sub, fontSize: font.sm }}>
                  {period}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center">
                <Ionicons name="time-outline" size={s(17)} color={sub} />
                <Text className="ml-2" style={{ color: sub, fontSize: font.sm }}>
                  {rentalDays} {t(rentalDays > 1 ? 'booking.dayPlural' : 'booking.daySingular')}
                </Text>
              </View>
            </View>
          </View>

          <View className="my-2 border-t" style={{ borderColor: border }} />
          <DetailRow
            icon="wallet-outline"
            label={t('confirmation.totalPaid')}
            value={`${booking?.total ?? 0} USD`}
          />
          <View className="border-t" style={{ borderColor: border }} />
          <DetailRow
            icon="receipt-outline"
            label={t('confirmation.reference')}
            value={booking?.reference ?? booking?.id ?? '—'}
          />
        </View>

        <View
          className="mt-4 rounded-2xl border p-4"
          style={{ backgroundColor: cardBg, borderColor: border }}>
          <Text className="mb-4 font-bold" style={{ color: fg, fontSize: font.base }}>
            {t('confirmation.nextStep')}
          </Text>
          <View className="flex-row">
            <View className="mr-3 items-center">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500">
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <View className="h-14 w-px bg-emerald-500" />
              <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-primary">
                <View className="h-3 w-3 rounded-full bg-primary" />
              </View>
            </View>
            <View className="flex-1">
              <Text className="font-semibold" style={{ color: fg, fontSize: font.sm }}>
                {t('confirmation.paymentConfirmed')}
              </Text>
              <Text className="mt-1" style={{ color: sub, fontSize: font.xs }}>
                {t('confirmation.paymentConfirmedDescription')}
              </Text>
              <View className="h-8" />
              <Text className="font-semibold text-primary" style={{ fontSize: font.sm }}>
                {t('confirmation.driverAssignment')}
              </Text>
              <Text className="mt-1" style={{ color: sub, fontSize: font.xs }}>
                {t('confirmation.driverAssignmentDescription')}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="mt-4 flex-row items-center rounded-2xl border px-4 py-3"
          style={{ backgroundColor: isDark ? '#3D241C' : '#FFF1EA', borderColor: isDark ? '#5B3428' : '#FFE0D2' }}>
          <Ionicons name="information-circle-outline" size={s(25)} color={color.primary} />
          <Text className="ml-3 flex-1" style={{ color: fg, fontSize: font.sm }}>
            {t('confirmation.driverInfoNotice')}
          </Text>
        </View>

        <TouchableOpacity
          className="mt-4 items-center rounded-xl bg-primary py-4"
          activeOpacity={0.85}
          onPress={onPressMyBookings}>
          <Text className="font-semibold text-white" style={{ fontSize: font.base }}>
            {t('confirmation.myBookings')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center py-4" activeOpacity={0.75} onPress={onPressContact}>
          <Text className="font-medium text-primary" style={{ fontSize: font.sm }}>
            {t('confirmation.contactUs')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
