import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Calendar, MapPin } from 'lucide-react-native';

import { ResStatus, ResType } from '@/constants/databaseEnum';
import { Booking } from '@/constants/dataInterface';
import { TranslationKey } from '@/lib/i18n';

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

function fmtBookingDateTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  const day = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
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
  const fg = isDark ? '#ffffff' : '#111827';
  const sub = isDark ? '#9ca3af' : '#6b7280';
  const divider = isDark ? '#2f2f2f' : '#e5e7eb';
  const borderColor = isDark ? '#2f2f2f' : '#e5e7eb';
  const cardBg = isDark ? '#1E1E1E' : '#ffffff';
  const highlightColor = isDark ? '#f59e0b' : '#ff8a00';
  const statusColor = STATUS_COLORS[item.status] ?? '#999';
  const bookingTypeLabel =
    item.type === ResType.LOC
      ? t(BOOKING_TYPE_LABELS[ResType.LOC])
      : t(BOOKING_TYPE_LABELS[ResType.TA]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderColor: highlighted ? highlightColor : borderColor,
          backgroundColor: highlighted ? (isDark ? '#2a2418' : '#fffaf0') : cardBg,
          borderWidth: highlighted ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}>
      {highlighted && badgeIsShow ? (
        <View style={[styles.highlightBadge, { backgroundColor: highlightColor }]}>
          <Text style={styles.highlightBadgeText}>Nouvelle reservation</Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <Text style={[styles.headerDate, { color: fg }]}>
          {fmtBookingDateTime(item.createAt, appLocale)}
        </Text>
        <Text style={[styles.headerType, { color: sub }]} numberOfLines={1}>
          {bookingTypeLabel}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: divider }]} />

      <View style={styles.bodyRow}>
        <View style={[styles.imageWrap, { backgroundColor: isDark ? '#262626' : '#f3f4f6' }]}>
          <Image
            source={getCarImageSource(item, isDark)}
            style={styles.cardImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: fg }]} numberOfLines={1}>
              {item.car?.name ?? '—'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]} numberOfLines={1}>
                {t(STATUS_LABELS[item.status] ?? 'reservations.status.pending')}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Calendar size={14} color={sub} />
            <Text style={[styles.metaText, { color: sub }]} numberOfLines={1}>
              {fmtBookingDateTime(item.departureAt, appLocale)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={14} color={sub} />
            <Text style={[styles.metaText, { color: sub }]} numberOfLines={1}>
              {item.departure?.label ?? '—'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: 'hidden',
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
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  headerType: {
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginBottom: 12,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: 80,
    height: 80,
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
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
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
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
  },
});
