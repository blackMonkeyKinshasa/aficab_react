import { useMemo, useState, type ComponentProps } from 'react';
import { Image, Linking, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  Share2,
  XCircle,
} from 'lucide-react-native';

import { BookingRecapDetailColumn } from '@/components/my-ui/BookingRecapDetail';
import { BookingRecapSection } from '@/components/my-ui/BookingRecapSection';
import {
  BookingRecapDriverNotice,
  BookingRecapStatusRow,
} from '@/components/my-ui/BookingRecapStatusCards';
import { BookingRideProgress } from '@/components/my-ui/BookingRideProgress';
import { InvoiceDownloadButton } from '@/components/reservation/InvoiceDownloadButton';
import {
  CAR_PLACEHOLDER,
  canClientCancelBooking,
  fmtDateTime,
  getCarImage,
  getRentalDays,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/components/reservation/reservation-helpers';
import { color } from '@/constants/colors';
import { ClientType, ResStatus, ResType, SUPPORT_PHONE } from '@/constants/databaseEnum';
import { Booking } from '@/constants/dataInterface';
import { TranslationKey } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import {
  buildPriceRecap,
  formatRecapPriceWithCurrency,
  type PriceRecapLine,
} from '@/lib/recap-format';

type PriceLine = {
  label: string;
  value: string;
  amount?: number;
  hint?: string;
  muted?: boolean;
  emphasize?: 'discount' | 'total' | 'subtotal';
};

type PriceBreakdown = {
  rentalLines: PriceLine[];
  extraHourLines: PriceLine[];
  otherLines: PriceLine[];
  rentalSubtotal: number;
  extraHoursSubtotal: number;
  optionsMissing: boolean;
};

type TranslateFn = (key: TranslationKey) => string;
type TranslateFormatFn = (
  key: TranslationKey,
  values: Record<string, string | number | undefined>
) => string;

function getDiscountAmount(booking: Booking) {
  const optionDiscount = booking.options?.couponDiscountAmount;
  if (typeof optionDiscount === 'number' && optionDiscount > 0) {
    return optionDiscount;
  }
  if (typeof booking.coupon?.discountAmount === 'number') {
    return booking.coupon.discountAmount;
  }
  if (typeof booking.originalTotal === 'number' && typeof booking.total === 'number') {
    return Math.max(0, booking.originalTotal - booking.total);
  }
  return 0;
}

function getRentalDurationLabel(booking: Booking, t: TranslateFn) {
  const rentalDays = getRentalDays(booking);
  const dayLabel = rentalDays > 1 ? t('booking.dayPlural') : t('booking.daySingular');
  return `${rentalDays} ${dayLabel}`;
}

function money(amount: number) {
  return formatRecapPriceWithCurrency(amount);
}

function toDisplayLine(line: PriceRecapLine): PriceLine {
  return {
    label: line.label,
    value: money(Math.abs(line.amount)),
    amount: line.amount,
    emphasize: line.group === 'discount' ? 'discount' : undefined,
  };
}

function getPriceBreakdown(
  booking: Booking,
  t: TranslateFn,
  tf: TranslateFormatFn,
  appLocale: string
): PriceBreakdown {
  const recap = buildPriceRecap(
    booking,
    {
      rental: (days) =>
        tf('booking.recapVehicleRental', {
          period: `${days} ${days > 1 ? t('booking.dayPlural') : t('booking.daySingular')}`,
        }),
      transfer: tf('booking.recapTripLine', {
        vehicle: booking.car?.name?.trim() || t('booking.vehicleUnknown'),
      }),
      flex: t('booking.flexShort'),
      premium: t('booking.premiumShort'),
      extraHoursFallback: t('booking.flexExtraHours'),
      discount: t('booking.discount'),
      total: t('booking.totalToPay'),
    },
    appLocale
  );

  const rentalLines = recap.lines
    .filter((line) => line.group === 'rental' || line.group === 'catalog')
    .map(toDisplayLine);
  const extraHourLines = recap.lines
    .filter((line) => line.group === 'extraHours')
    .map((line) => ({
      ...toDisplayLine(line),
      value: line.amount > 0 ? money(line.amount) : '—',
    }));
  const otherLines = recap.lines
    .filter((line) => line.group === 'discount')
    .map((line) => ({
      ...toDisplayLine(line),
      value: `- ${money(Math.abs(line.amount))}`,
    }));

  return {
    rentalLines,
    extraHourLines,
    otherLines,
    rentalSubtotal: recap.rentalSubtotal,
    extraHoursSubtotal: recap.extraHoursSubtotal,
    optionsMissing: recap.optionsMissing,
  };
}

type InfoRow = {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

function getOtherInfoRows(booking: Booking, t: (key: TranslationKey) => string): InfoRow[] {
  const options = booking.options ?? {};
  const rows: InfoRow[] = [];

  if (booking.type === ResType.TA) {
    const tripType =
      options.tripType === 'round-trip' || booking.taReturn === true
        ? t('booking.roundTrip')
        : options.tripType === 'one-way' || booking.taReturn === false
          ? t('booking.oneWay')
          : null;
    if (tripType) {
      rows.push({
        icon: 'swap-horizontal-outline',
        label: t('booking.transferType'),
        value: tripType,
      });
    }

    const flightNumber = booking.taVolNumber?.trim();
    if (flightNumber) {
      rows.push({
        icon: 'airplane-outline',
        label: t('reservations.field.flightNumber'),
        value: flightNumber,
      });
    }
  }

  const guestName = booking.guest?.fullName?.trim();
  const guestPhone = booking.guest?.phone?.trim();
  const guestEmail = booking.guest?.email?.trim();
  if (guestName) {
    rows.push({ icon: 'person-outline', label: t('reservations.field.guest'), value: guestName });
  }
  if (guestPhone) {
    rows.push({ icon: 'call-outline', label: t('booking.phoneNumber'), value: guestPhone });
  }
  if (guestEmail) {
    rows.push({ icon: 'mail-outline', label: t('booking.email'), value: guestEmail });
  }

  const comment = booking.commentaire?.trim();
  if (comment) {
    rows.push({
      icon: 'chatbubble-ellipses-outline',
      label: t('booking.specialInstructions'),
      value: comment,
    });
  }

  return rows;
}

export function TripSummaryView({
  booking,
  isDark,
  isCancelling,
  onPay,
  onCancel,
  onReview,
  onBookAgain,
  t,
  tf,
  appLocale,
}: {
  booking: Booking;
  isDark: boolean;
  isCancelling: boolean;
  onPay: () => void;
  onCancel: () => void;
  onReview: () => void;
  onBookAgain: () => void;
  t: (key: TranslationKey) => string;
  tf: (key: TranslationKey, values: Record<string, string | number | undefined>) => string;
  appLocale: string;
}) {
  const { s, font } = useLayoutScale();
  const fg = isDark ? '#ffffff' : '#111827';
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const cardBg = isDark ? '#1E1E1E' : '#ffffff';
  const borderColor = isDark ? '#2F2F2F' : '#E5E7EB';
  const accentBg = isDark ? '#3D241C' : '#FFE8DC';
  const statusColor = STATUS_COLORS[booking.status] ?? '#999';
  const driverUser = booking.driver?.user as Record<string, string> | undefined;
  const driverAvatar = driverUser?.avatar_url ?? null;
  const driverName = driverUser?.full_name ?? '—';
  const driverPhone = driverUser?.phone ?? null;
  const showDriver =
    !!booking.driver &&
    (booking.status === ResStatus.CONFIRMED || booking.status === ResStatus.STARTED);
  const showWaitingDriver =
    (booking.status === ResStatus.PENDING || booking.status === ResStatus.PENDINGDRIVER) &&
    booking.isPaid;
  const isStandardClient = booking.client?.clientType !== ClientType.PREMIUM;
  const canPay =
    isStandardClient &&
    !booking.isPaid &&
    (booking.status === ResStatus.PENDING || booking.status === ResStatus.PENDINGDRIVER);
  const canCancel = canClientCancelBooking(booking);
  const canReview =
    booking.status === ResStatus.ENDED && !booking.review && Boolean(booking.driverId);
  const canBookAgain =
    booking.status === ResStatus.ENDED ||
    booking.status === ResStatus.CANCELED ||
    booking.status === ResStatus.ARCHIVED;
  const priceBreakdown = useMemo(
    () => getPriceBreakdown(booking, t, tf, appLocale),
    [booking, t, tf, appLocale]
  );
  const otherInfoRows = useMemo(() => getOtherInfoRows(booking, t), [booking, t]);
  const discount = getDiscountAmount(booking);
  const totalValue = money(booking.total ?? 0);
  const isDailyRental = booking.type === ResType.LOC;
  const rentalDurationLabel = isDailyRental ? getRentalDurationLabel(booking, t) : null;
  const pickupLabel = booking.departure?.label?.trim() || '—';
  const destinationLabel = booking.arrival?.label?.trim() || null;
  const hasDailyEndTime =
    isDailyRental &&
    typeof booking.arrivalAt === 'string' &&
    booking.arrivalAt.trim().length > 0 &&
    !Number.isNaN(new Date(booking.arrivalAt).getTime());
  const hasReturnTime =
    !isDailyRental &&
    booking.taReturn === true &&
    typeof booking.taReturnAt === 'string' &&
    booking.taReturnAt.trim().length > 0 &&
    !Number.isNaN(new Date(booking.taReturnAt).getTime());
  const canShowRegistration = [
    ResStatus.CONFIRMED,
    ResStatus.STARTED,
    ResStatus.ENDED,
    ResStatus.ARCHIVED,
  ].includes(booking.status);
  const registrationId = booking.car?.registrationId?.trim();
  const vehicleMeta = [
    canShowRegistration && registrationId ? registrationId : null,
    isDailyRental
      ? rentalDurationLabel
      : booking.options?.tripType === 'round-trip' || booking.taReturn
        ? t('booking.roundTrip')
        : t('booking.oneWay'),
  ].filter(Boolean);

  const handleShare = () => {
    const typeLabel =
      booking.type === ResType.LOC
        ? t('reservations.type.dailyRental')
        : t('reservations.type.airportTransfer');
    const periodLabel = isDailyRental
      ? tf('reservations.rentalFromTo', {
          start: fmtDateTime(booking.departureAt, appLocale),
          end: fmtDateTime(booking.arrivalAt, appLocale),
        })
      : fmtDateTime(booking.departureAt, appLocale);
    void Share.share({
      message: [`Aficab — ${typeLabel}`, pickupLabel, periodLabel, rentalDurationLabel]
        .filter(Boolean)
        .join('\n'),
    });
  };

  const typeLabel = booking.type === ResType.TA ? t('home.airportTitle') : t('booking.dailyTab');
  const isFrench = appLocale.toLowerCase().startsWith('fr');
  const statusLabel = t(STATUS_LABELS[booking.status] ?? 'reservations.status.pending');
  const statusEventDate =
    booking.status === ResStatus.CANCELED
      ? booking.cancelAt
      : booking.status === ResStatus.ENDED || booking.status === ResStatus.ARCHIVED
        ? booking.rideEndAt
        : booking.status === ResStatus.STARTED
          ? booking.rideStartAt
          : booking.departureAt;
  const statusDescription =
    booking.status === ResStatus.CANCELED
      ? booking.cancelReason?.trim() ||
        (isFrench ? 'Cette réservation a été annulée.' : 'This booking was canceled.')
      : booking.status === ResStatus.ENDED || booking.status === ResStatus.ARCHIVED
        ? isFrench
          ? "Merci d'avoir voyagé avec Aficab."
          : 'Thank you for riding with Aficab.'
        : booking.status === ResStatus.STARTED
          ? isFrench
            ? 'Votre course est actuellement en cours.'
            : 'Your ride is currently in progress.'
          : booking.status === ResStatus.CONFIRMED
            ? isFrench
              ? 'Votre réservation est confirmée.'
              : 'Your booking is confirmed.'
            : !booking.isPaid && isStandardClient
              ? isFrench
                ? 'Finalisez le paiement pour confirmer la réservation.'
                : 'Complete payment to confirm your booking.'
              : t('booking.driverAssignmentPending');

  const renderPriceLine = (line: PriceLine, key: string) => (
    <View key={key} className="mb-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text
            style={{
              color: line.emphasize === 'discount' ? '#16A34A' : line.muted ? sub : fg,
              fontSize: font.sm,
              fontWeight: line.emphasize === 'discount' ? '600' : '500',
            }}>
            {line.label}
          </Text>
          {line.hint ? (
            <Text className="mt-0.5" style={{ color: sub, fontSize: font.xs }}>
              {line.hint}
            </Text>
          ) : null}
        </View>
        {line.value ? (
          <Text
            className="font-semibold"
            style={{
              color: line.emphasize === 'discount' ? '#16A34A' : line.muted ? sub : fg,
              fontSize: font.sm,
            }}>
            {line.value}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const priceDetailsCard = (
    <View
      className="mb-4 rounded-xl border px-4 py-4"
      style={{ borderColor, backgroundColor: cardBg }}>
      <View className="mb-3 flex-row items-center">
        <Ionicons name="calculator-outline" size={s(18)} color={fg} />
        <Text className="ml-2 font-semibold" style={{ color: fg, fontSize: font.base }}>
          {t('booking.priceDetails')}
        </Text>
      </View>

      {priceBreakdown.optionsMissing ? (
        <Text className="mb-3" style={{ color: sub, fontSize: font.sm }}>
          {t('booking.priceDetailUnavailable')}
        </Text>
      ) : null}

      {priceBreakdown.rentalLines.map((line, index) =>
        renderPriceLine(line, `rental-${index}-${line.label}`)
      )}

      {priceBreakdown.extraHourLines.length > 0 ? (
        <View className="mt-1">
          {priceBreakdown.extraHourLines.map((line, index) =>
            renderPriceLine(line, `extra-${index}-${line.label}`)
          )}
        </View>
      ) : null}

      {priceBreakdown.otherLines.map((line, index) =>
        renderPriceLine(line, `other-${index}-${line.label}`)
      )}

      <View className="mt-2 border-t pt-3" style={{ borderColor }}>
        <View className="mb-2 flex-row justify-between">
          <Text style={{ color: sub, fontSize: font.sm }}>{t('booking.rentalPrice')}</Text>
          <Text className="font-semibold" style={{ color: fg, fontSize: font.sm }}>
            {money(priceBreakdown.rentalSubtotal)}
          </Text>
        </View>
        {priceBreakdown.extraHoursSubtotal > 0 || priceBreakdown.extraHourLines.length > 0 ? (
          <View className="mb-2 flex-row justify-between">
            <Text style={{ color: sub, fontSize: font.sm }}>{t('booking.extraHoursPrice')}</Text>
            <Text className="font-semibold" style={{ color: fg, fontSize: font.sm }}>
              {money(priceBreakdown.extraHoursSubtotal)}
            </Text>
          </View>
        ) : null}
        {discount > 0 && typeof booking.originalTotal === 'number' ? (
          <View className="mb-2 flex-row justify-between">
            <Text style={{ color: sub, fontSize: font.sm }}>
              {t('reservations.field.beforeDiscount')}
            </Text>
            <Text style={{ color: sub, fontSize: font.sm }}>{money(booking.originalTotal)}</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-1 flex-row justify-between border-t pt-3" style={{ borderColor }}>
        <Text className="font-bold" style={{ color: fg, fontSize: font.base }}>
          {t('booking.totalToPay')}
        </Text>
        <Text className="font-bold" style={{ color: color.primary, fontSize: font.xl }}>
          {totalValue}
        </Text>
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text style={{ color: sub, fontSize: font.sm }}>{t('reservations.field.status')}</Text>
        <Text
          className="font-semibold"
          style={{ color: booking.isPaid ? '#16A34A' : color.primary, fontSize: font.sm }}>
          {booking.isPaid ? t('reservations.field.paid') : t('reservations.unpaid')}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-3 py-4">
        <View
          className="mb-4 rounded-xl border p-4"
          style={{ borderColor, backgroundColor: cardBg }}>
          <View className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1">
              <Text className="font-bold" style={{ color: fg, fontSize: font.base }} numberOfLines={2}>
                {booking.car?.name ?? t('booking.vehicleUnknown')}
              </Text>
              <Text className="mt-1" style={{ color: sub, fontSize: font.xs }} numberOfLines={2}>
                {vehicleMeta.length > 0 ? vehicleMeta.join(' · ') : typeLabel}
              </Text>
              <Text className="mt-2 font-bold" style={{ color: fg, fontSize: font.lg }}>
                {totalValue}
              </Text>
              <View className="mt-1 flex-row items-center">
                {booking.isPaid ? (
                  <>
                    <CheckCircle2 size={s(12)} color="#16A34A" />
                    <Text
                      className="ml-1 font-semibold"
                      style={{ color: '#16A34A', fontSize: font.xs }}>
                      {t('reservations.field.paid')}
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={s(12)} color={color.primary} />
                    <Text
                      className="ml-1 font-semibold"
                      style={{ color: color.primary, fontSize: font.xs }}>
                      {t('reservations.unpaid')}
                    </Text>
                  </>
                )}
              </View>
            </View>
            <Image
              source={{ uri: getCarImage(booking) }}
              style={{ width: s(148), height: s(100) }}
              resizeMode="contain"
            />
          </View>
        </View>

      {/*  <View
          className="mb-4 flex-row items-start rounded-xl border p-4"
          style={{
            borderColor: statusColor,
            backgroundColor: `${statusColor}10`,
          }}>
          {booking.status === ResStatus.CANCELED ? (
            <XCircle size={s(24)} color={statusColor} />
          ) : booking.status === ResStatus.ENDED || booking.status === ResStatus.ARCHIVED ? (
            <CheckCircle2 size={s(24)} color={statusColor} />
          ) : booking.status === ResStatus.STARTED ? (
            <Clock3 size={s(24)} color={statusColor} />
          ) : (
            <Clock3 size={s(24)} color={statusColor} />
          )}
          <View className="ml-3 flex-1">
            <Text className="font-bold" style={{ color: statusColor, fontSize: font.sm }}>
              {statusLabel}
            </Text>
            {statusEventDate ? (
              <Text className="mt-0.5 text-xs" style={{ color: fg }}>
                {fmtDateTime(statusEventDate, appLocale)}
              </Text>
            ) : null}
            <Text className="mt-1 text-xs" style={{ color: sub }}>
              {statusDescription}
            </Text>
          </View>
        </View>*/}

        <BookingRideProgress
          status={booking.status}
          isPaid={booking.isPaid}
          isStandardClient={isStandardClient}
        />

        <View
          className="mb-4 rounded-xl border p-4"
          style={{ borderColor, backgroundColor: cardBg }}>
          <View className="mb-3 flex-row items-center">
            <Ionicons name="location-outline" size={s(18)} color={fg} />
            <Text className="ml-2 font-bold" style={{ color: fg, fontSize: font.base }}>
              {isFrench ? 'Détails du trajet' : 'Trip details'}
            </Text>
          </View>
          <View className="mb-3 flex-row gap-4">
            <View className="flex-1">
              <View className="mb-1 flex-row items-center">
                <Ionicons name="calendar-outline" size={s(14)} color={sub} />
                <Text className="ml-1 text-xs" style={{ color: sub }}>
                  {isDailyRental ? t('booking.startDateTime') : t('reservations.field.departure')}
                </Text>
              </View>
              <Text className="mt-1 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                {fmtDateTime(booking.departureAt, appLocale)}
              </Text>
            </View>
            {hasDailyEndTime || hasReturnTime ? (
              <View className="flex-1">
                <View className="mb-1 flex-row items-center">
                  <Ionicons name="calendar-outline" size={s(14)} color={sub} />
                  <Text className="ml-1 text-xs" style={{ color: sub }}>
                    {isDailyRental ? t('booking.endDateTime') : t('booking.returnDateTime')}
                  </Text>
                </View>
                <Text className="mt-1 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                  {fmtDateTime(isDailyRental ? booking.arrivalAt : booking.taReturnAt, appLocale)}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <View className="mb-1 flex-row items-center">
                <Ionicons name="map-outline" size={s(14)} color={sub} />
                <Text className="ml-1 text-xs" style={{ color: sub }}>
                  {t('booking.from')}
                </Text>
              </View>
              <Text
                className="mt-1 font-semibold"
                style={{ color: fg, fontSize: font.sm }}
                numberOfLines={3}>
                {pickupLabel}
              </Text>
            </View>
            {isDailyRental || destinationLabel ? (
              <View className="flex-1">
                <View className="mb-1 flex-row items-center">
                  <Ionicons name="navigate-outline" size={s(14)} color={sub} />
                  <Text className="ml-1 text-xs" style={{ color: sub }}>
                    {t('booking.destination')}
                  </Text>
                </View>
                <Text
                  className="mt-1 font-semibold"
                  style={{ color: fg, fontSize: font.sm }}
                  numberOfLines={3}>
                  {isDailyRental ? '...' : destinationLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {showDriver ? (
          <View
            className="mb-4 rounded-xl border p-4"
            style={{ borderColor, backgroundColor: cardBg }}>
            <View className="mb-3 flex-row items-center">
              <Ionicons name="person-circle-outline" size={s(20)} color={fg} />
              <Text className="ml-2 font-bold" style={{ color: fg, fontSize: font.base }}>
                {isFrench ? 'Chauffeur' : 'Driver'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Image
                source={{ uri: driverAvatar ?? CAR_PLACEHOLDER }}
                className="rounded-full bg-gray-300"
                style={{ width: s(48), height: s(48) }}
              />
              <View className="ml-3 flex-1">
                <Text className="font-semibold" style={{ color: fg, fontSize: font.base }}>
                  {driverName}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: sub }}>
                  {booking.car?.registrationId || '—'}
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row justify-around">
              {driverPhone ? (
                <TouchableOpacity
                  className="items-center"
                  onPress={() =>
                    Linking.openURL(`https://wa.me/${driverPhone.replace(/\D/g, '')}`)
                  }>
                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      backgroundColor: '#16A34A20',
                      width: s(44),
                      height: s(44),
                    }}>
                    <MessageCircle size={s(18)} color="#16A34A" />
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: sub }}>
                    {isFrench ? 'WhatsApp' : 'WhatsApp'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {driverPhone ? (
                <TouchableOpacity
                  className="items-center"
                  onPress={() => Linking.openURL(`tel:${driverPhone}`)}>
                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      backgroundColor: '#2563EB20',
                      width: s(44),
                      height: s(44),
                    }}>
                    <Phone size={s(18)} color="#2563EB" />
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: sub }}>
                    {isFrench ? 'Appeler' : 'Call'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity className="items-center" onPress={handleShare}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${color.primary}20`,
                    width: s(44),
                    height: s(44),
                  }}>
                  <Share2 size={s(18)} color={color.primary} />
                </View>
                <Text className="mt-1 text-xs" style={{ color: sub }}>
                  {isFrench ? 'Partager' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showWaitingDriver ? (
          <View className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-[#1E3A8A] dark:bg-[#0C1B35]">
            <Text className="font-bold" style={{ color: '#2563EB', fontSize: font.sm }}>
              {t('booking.driverAssignmentPending')}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: sub }}>
              {t('booking.driverCoordinatesNotice')}
            </Text>
          </View>
        ) : null}

        {booking.status === ResStatus.CANCELED ? (
          <View
            className="mb-4 rounded-xl border p-4"
            style={{ borderColor, backgroundColor: cardBg }}>
            <View className="mb-3 flex-row items-center">
              <Ionicons name="close-circle-outline" size={s(20)} color="#EF4444" />
              <Text className="ml-2 font-bold" style={{ color: fg, fontSize: font.base }}>
                {isFrench ? "Informations d'annulation" : 'Cancellation information'}
              </Text>
            </View>
            <View className="mb-3">
              <View className="mb-1 flex-row items-center">
                <Ionicons name="calendar-outline" size={s(14)} color={sub} />
                <Text className="ml-1 text-xs" style={{ color: sub }}>
                  {isFrench ? "Date d'annulation" : 'Cancellation date'}
                </Text>
              </View>
              <Text className="mt-1 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                {fmtDateTime(booking.cancelAt, appLocale)}
              </Text>
            </View>
            <View>
              <View className="mb-1 flex-row items-center">
                <Ionicons name="information-circle-outline" size={s(14)} color={sub} />
                <Text className="ml-1 text-xs" style={{ color: sub }}>
                  {isFrench ? 'Motif' : 'Reason'}
                </Text>
              </View>
              <Text className="mt-1 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                {booking.cancelReason?.trim() ||
                  (isFrench ? 'Aucun motif renseigné' : 'No reason provided')}
              </Text>
            </View>
          </View>
        ) : booking.rideStartAt || booking.rideEndAt ? (
          <View
            className="mb-4 rounded-xl border p-4"
            style={{ borderColor, backgroundColor: cardBg }}>
            <View className="mb-3 flex-row items-center">
              <Ionicons name="play-circle-outline" size={s(20)} color={fg} />
              <Text className="ml-2 font-bold" style={{ color: fg, fontSize: font.base }}>
                {isFrench ? 'Déroulement de la course' : 'Ride activity'}
              </Text>
            </View>
            {booking.rideStartAt ? (
              <View className="mb-3">
                <View className="mb-1 flex-row items-center">
                  <Ionicons name="play-outline" size={s(14)} color={sub} />
                  <Text className="ml-1 text-xs" style={{ color: sub }}>
                    {t('reservations.field.rideStart')}
                  </Text>
                </View>
                <Text className="mt-1 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                  {fmtDateTime(booking.rideStartAt, appLocale)}
                </Text>
              </View>
            ) : null}
            {booking.rideEndAt ? (
              <View>
                <View className="mb-1 flex-row items-center">
                  <Ionicons name="checkmark-circle-outline" size={s(14)} color={sub} />
                  <Text className="ml-1 text-xs" style={{ color: sub }}>
                    {t('reservations.field.rideEnd')}
                  </Text>
                </View>
                <Text className="mt-1 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                  {fmtDateTime(booking.rideEndAt, appLocale)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {priceDetailsCard}

        {otherInfoRows.length > 0 ? (
          <View
            className="mb-4 rounded-xl border p-4"
            style={{ borderColor, backgroundColor: cardBg }}>
            <View className="mb-3 flex-row items-center">
              <Ionicons name="information-circle-outline" size={s(20)} color={fg} />
              <Text className="ml-2 font-bold" style={{ color: fg, fontSize: font.base }}>
                {t('reservations.section.otherInfo')}
              </Text>
            </View>
            {otherInfoRows.map((row) => (
              <View key={`${row.label}-${row.value}`} className="mb-2">
                <View className="mb-1 flex-row items-center">
                  <Ionicons name={row.icon} size={s(14)} color={sub} />
                  <Text className="ml-1 text-xs" style={{ color: sub }}>
                    {row.label}
                  </Text>
                </View>
                <Text className="mt-0.5 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                  {row.value.replace(/\n/g, ' · ')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {isDailyRental ? (
          <View
            className="mb-4 rounded-xl border p-4"
            style={{ borderColor, backgroundColor: cardBg }}>
            <View className="mb-2 flex-row items-center">
              <Ionicons name="flash-outline" size={s(16)} color={fg} />
              <Text className="ml-2 font-semibold" style={{ color: fg, fontSize: font.sm }}>
                {t('reservations.field.fuel')}
              </Text>
            </View>
            <Text
              className="mt-1 font-bold"
              style={{
                color:
                  typeof booking.options?.fuel === 'number' && booking.options.fuel > 0
                    ? '#16A34A'
                    : color.primary,
                fontSize: font.sm,
              }}>
              {typeof booking.options?.fuel === 'number' && booking.options.fuel > 0
                ? t('reservations.field.fuelIncluded')
                : t('reservations.field.fuelClientExpense')}
            </Text>
          </View>
        ) : null}

        {booking.status !== ResStatus.CANCELED ? (
          <View className="mb-4">
            <InvoiceDownloadButton booking={booking} />
          </View>
        ) : null}

        {canCancel ? (
          <TouchableOpacity
            className="mb-4 flex-row items-center justify-center rounded-xl border border-red-500 py-3"
            disabled={isCancelling}
            onPress={onCancel}>
            <Text className="font-semibold text-red-500" style={{ fontSize: font.base }}>
              {isCancelling ? t('reservations.cancelLoading') : t('reservations.cancelRide')}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View className="mb-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl border py-3"
            style={{ borderColor }}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
            <Phone size={s(16)} color={fg} />
            <Text className="ml-2 font-semibold" style={{ color: fg, fontSize: font.sm }}>
              {isFrench ? 'Contacter Aficab' : 'Contact Aficab'}
            </Text>
          </TouchableOpacity>

          {canPay || canReview || canBookAgain ? (
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center rounded-xl py-3"
              style={{ backgroundColor: color.primary }}
              onPress={canPay ? onPay : canReview ? onReview : onBookAgain}>
              <Ionicons
                name={canPay ? 'card-outline' : canReview ? 'star-outline' : 'refresh-outline'}
                size={s(16)}
                color="#FFFFFF"
              />
              <Text className="ml-2 font-semibold text-white" style={{ fontSize: font.sm }}>
                {canPay
                  ? tf('reservations.payAmount', { amount: booking.total ?? 0 })
                  : canReview
                    ? t('reservations.reviewForm.open')
                    : isFrench
                      ? 'Réserver à nouveau'
                      : 'Book again'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {canPay ? (
          <Text className="mb-6 text-center text-xs" style={{ color: sub }}>
            {t('reservations.paymentSecure')}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
