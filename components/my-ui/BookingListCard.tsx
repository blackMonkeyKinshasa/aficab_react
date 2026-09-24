import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  XCircle,
} from 'lucide-react-native';

import { ResStatus, ResType } from '@/constants/databaseEnum';
import { Booking } from '@/constants/dataInterface';
import { TranslationKey } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import {
  fmtDay,
  getRentalDays,
  getStatusHighlightStyles,
  isMultiDayRental,
} from '@/components/reservation/reservation-helpers';

const STATUS_COLORS: Record<ResStatus, string> = {
  [ResStatus.PENDING]: '#FFA500',
  [ResStatus.PENDINGDRIVER]: '#FFC107',
  [ResStatus.CONFIRMED]: '#2196F3',
  [ResStatus.STARTED]: '#9C27B0',
  [ResStatus.ENDED]: '#4CAF50',
  [ResStatus.CANCELED]: '#F44336',
  [ResStatus.ARCHIVED]: '#9E9E9E',
};

const STATUS_LABELS: Record<ResStatus, TranslationKey> = {
  [ResStatus.PENDING]: 'reservations.status.pending',
  [ResStatus.PENDINGDRIVER]: 'reservations.status.pendingDriver',
  [ResStatus.CONFIRMED]: 'reservations.status.confirmed',
  [ResStatus.STARTED]: 'reservations.status.started',
  [ResStatus.ENDED]: 'reservations.status.ended',
  [ResStatus.CANCELED]: 'reservations.status.canceled',
  [ResStatus.ARCHIVED]: 'reservations.status.archived',
};

const BOOKING_TYPE_LABELS: Record<ResType, TranslationKey> = {
  [ResType.LOC]: 'reservations.type.dailyRental',
  [ResType.TA]: 'reservations.type.airportTransfer',
};

const FALLBACK_CAR_IMAGE = require('@/assets/images/aficab-logo-black.png');

function toDate(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fmtCreatedAt(iso: string | null | undefined, locale: string) {
  const date = toDate(iso);
  if (!date) return { date: '—', time: '—' };

  return {
    date: date.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  };
}

function fmtBookingDateTime(iso: string | null | undefined, locale: string) {
  const date = toDate(iso);
  if (!date) return '—';
  const day = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

function getStatusContext(item: Booking, locale: string) {
  const isFrench = locale.toLowerCase().startsWith('fr');
  const statusDate =
    item.status === ResStatus.ENDED || item.status === ResStatus.ARCHIVED
      ? item.rideEndAt ?? item.arrivalAt ?? item.updateAt
      : item.status === ResStatus.CANCELED
        ? item.cancelAt ?? item.updateAt
        : item.status === ResStatus.STARTED
          ? item.rideStartAt ?? item.departureAt
          : item.departureAt;
  const formattedDate = fmtBookingDateTime(statusDate, locale);

  switch (item.status) {
    case ResStatus.ENDED:
      return isFrench ? `Course terminée le ${formattedDate}` : `Ride completed on ${formattedDate}`;
    case ResStatus.CANCELED:
      return isFrench ? `Annulée le ${formattedDate}` : `Canceled on ${formattedDate}`;
    case ResStatus.ARCHIVED:
      return isFrench ? `Course archivée le ${formattedDate}` : `Ride archived on ${formattedDate}`;
    case ResStatus.STARTED:
      return isFrench ? `Course démarrée le ${formattedDate}` : `Ride started on ${formattedDate}`;
    default:
      return isFrench ? `Départ prévu le ${formattedDate}` : `Scheduled for ${formattedDate}`;
  }
}

function getCarImageSource(booking: Booking, isDark: boolean): ImageSourcePropType {
  const imgs = booking.car?.images;
  if (imgs && imgs.length > 0 && typeof imgs[0] === 'string') {
    return { uri: imgs[0] };
  }

  return isDark ? require('@/assets/images/aficab-logo-white.png') : FALLBACK_CAR_IMAGE;
}

export interface BookingListCardProps {
  item: Booking;
  isDark: boolean;
  highlighted?: boolean;
  badgeIsShow?: boolean;
  onPress: () => void;
  t: (key: TranslationKey) => string;
  appLocale: string;
}

export function BookingListCard({
  item,
  isDark,
  highlighted = false,
  badgeIsShow = false,
  onPress,
  t,
  appLocale,
}: BookingListCardProps) {
  const { s, ms, font } = useLayoutScale();
  const thumb = s(82);
  const fg = isDark ? '#ffffff' : '#111827';
  const sub = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#2f2f2f' : '#e5e7eb';
  const cardBg = isDark ? '#1E1E1E' : '#ffffff';
  const statusColor = STATUS_COLORS[item.status] ?? '#999';
  const highlightStyles = getStatusHighlightStyles(statusColor, isDark);
  const createdAt = fmtCreatedAt(item.createAt, appLocale);
  const isCanceled = item.status === ResStatus.CANCELED;
  const isCompleted = item.status === ResStatus.ENDED || item.status === ResStatus.ARCHIVED;
  const paymentColor = item.isPaid ? '#16a34a' : isCanceled ? '#dc2626' : '#d97706';
  const paymentLabel = item.isPaid
    ? t('reservations.field.paid')
    : isCanceled
      ? appLocale.toLowerCase().startsWith('fr')
        ? 'Non facturé'
        : 'Not billed'
      : t('reservations.unpaid');
  const detailsLabel = appLocale.toLowerCase().startsWith('fr') ? 'Voir les détails' : 'View details';
  const referenceLabel = appLocale.toLowerCase().startsWith('fr') ? 'Réf.' : 'Ref.';
  const bookingTypeLabel =
    item.type === ResType.LOC
      ? t(BOOKING_TYPE_LABELS[ResType.LOC])
      : t(BOOKING_TYPE_LABELS[ResType.TA]);
  const rentalDays = item.type === ResType.LOC ? getRentalDays(item) : 1;
  const dateLabel = isMultiDayRental(item)
    ? `${fmtDay(item.departureAt, appLocale)} → ${fmtDay(item.arrivalAt, appLocale)} · ${rentalDays} ${t('booking.dayPlural')}`
    : fmtBookingDateTime(item.departureAt, appLocale);
  const totalLabel = `${Number(item.total ?? 0).toLocaleString(appLocale)} ${item.currency ?? 'USD'}`;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderColor: highlighted ? highlightStyles.borderColor : borderColor,
          backgroundColor: highlighted ? highlightStyles.backgroundColor : cardBg,
          borderWidth: highlighted ? 1.5 : 1,
          shadowColor: highlighted ? highlightStyles.shadowColor : '#000',
          shadowOpacity: highlighted ? 0.18 : 0.07,
          shadowRadius: highlighted ? 12 : 8,
          elevation: highlighted ? 4 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={[styles.statusRail, { backgroundColor: statusColor }]} />

      {highlighted && badgeIsShow ? (
        <View style={[styles.highlightBadge, { backgroundColor: highlightStyles.badgeColor }]}>
          <Text style={[styles.highlightBadgeText, { fontSize: font.xs }]}>
            {t('reservations.newBookingBadge')}
          </Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerDate, { color: fg, fontSize: font.sm }]}>{createdAt.date}</Text>
          <Text style={[styles.headerTime, { color: sub, fontSize: font.xs }]}>{createdAt.time}</Text>
        </View>
        <Text style={[styles.headerType, { color: sub, fontSize: font.xs }]} numberOfLines={1}>
          {bookingTypeLabel}
        </Text>
      </View>

      <View style={styles.bodyRow}>

       {/*  item car image */}
        <View
          style={[
            styles.imageWrap,
            { backgroundColor: isDark ? '#262626' : '#f9fafb', width: thumb, height: thumb },
          ]}>
          <Image
            source={getCarImageSource(item, isDark)}
            style={{ width: thumb, height: thumb }}
            resizeMode="contain"
          />
        </View>

       {/* column des detail  */}
        <View  style={styles.cardContent}>
        {/* title row */}
        <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: fg, fontSize: font.md }]} numberOfLines={1}>
              {item.car?.name ?? '—'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
              <Text
                style={[styles.statusBadgeText, { color: statusColor, fontSize: font.xs }]}
                numberOfLines={1}>
                {t(STATUS_LABELS[item.status] ?? 'reservations.status.pending')}
              </Text>
            </View>
          </View>

          {/* meta row */}
          <View className='flex-row'>  

              <View>

                      {/* date row */}
                    <View style={styles.metaRow}>
                      <Calendar size={ms(14)} color={sub} />
                      <Text
                        style={[styles.metaText, { color: sub, fontSize: font.sm }]}
                        numberOfLines={isMultiDayRental(item) ? 2 : 1}>
                        {dateLabel}
                      </Text>
                    </View>

                    {/* departure row */}
                    <View style={styles.metaRow}>
                      <MapPin size={ms(14)} color={sub} />
                      <Text style={[styles.metaText, { color: sub, fontSize: font.sm }]} numberOfLines={1}>
                        {item.departure?.label ?? '—'}
                      </Text>
                    </View>

                    {/* reference row */}
                    <Text style={
                      [styles.referenceText, { color: sub, fontSize: font.xs }]} numberOfLines={1}>
                      {referenceLabel} : {item.reference ?? item.id}
                    </Text>
                    
              </View>

            {/* price column */}
            <View style={styles.priceColumn}>
              <Text style={[styles.totalText, { color: fg, fontSize: font.md }]} numberOfLines={1}>
                {totalLabel}
              </Text>

              {/* payment row */}
              <View style={styles.paymentRow}>
                {item.isPaid ? <CheckCircle2 size={ms(13)} color={paymentColor} /> : null}
                <Text style={[styles.paymentText, { color: paymentColor, fontSize: font.xs }]}>
                  {paymentLabel}
                </Text>
              </View>
            </View>

          </View>


        </View>


       


      </View>

      <View style={styles.footerRow}>
        <View
          style={[
            styles.contextBanner,
            {
              backgroundColor: `${statusColor}14`,
              borderColor: `${statusColor}35`,
            },
          ]}>
          {isCompleted ? (
            <CheckCircle2 size={ms(15)} color={statusColor} />
          ) : isCanceled ? (
            <XCircle size={ms(15)} color={statusColor} />
          ) : (
            <Clock3 size={ms(15)} color={statusColor} />
          )}
          <Text
            style={[styles.contextText, { color: statusColor, fontSize: font.xs }]}
            numberOfLines={1}>
            {getStatusContext(item, appLocale)}
          </Text>
        </View>

       
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 10,
    overflow: 'hidden',
    elevation: 1,
  },
  statusRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  highlightBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerDate: {
    fontWeight: '700',
    flexShrink: 1,
  },
  headerTime: {
    marginTop: 2,
    fontWeight: '500',
  },
  headerType: {
    flexShrink: 1,
    textAlign: 'right',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrap: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  cardTitle: {
    fontWeight: '700',
    flexShrink: 1,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  statusBadgeText: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  metaText: {
    flex: 1,
  },
  referenceText: {
    fontWeight: '500',
  },
  priceColumn: {
    minWidth: 78,
    marginLeft: 8,
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  totalText: {
    fontWeight: '800',
    textAlign: 'right',
  },
  paymentRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  paymentText: {
    fontWeight: '700',
    textAlign: 'right',
  },
  footerRow: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  contextBanner: {
    minWidth: 0,
    flex: 1,
    minHeight: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextText: {
    flex: 1,
    fontWeight: '600',
  },
  detailsButton: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  detailsButtonText: {
    fontWeight: '700',
  },
});
