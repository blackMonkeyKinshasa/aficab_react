import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Booking } from '@/constants/dataInterface';
import { TranslationKey } from '@/lib/i18n';

import {
  fmtDay,
  fmtTime,
  getCarImage,
  getStatusHighlightStyles,
  STATUS_COLORS,
  STATUS_LABELS,
} from './reservation-helpers';

type BookingCardProps = {
  item: Booking;
  isDark: boolean;
  highlighted: boolean;
  badgeIsShow: boolean;
  onPress: () => void;
  t: (key: TranslationKey) => string;
  appLocale: string;
};

export function BookingCard({
  item,
  isDark,
  highlighted,
  badgeIsShow = false,
  onPress,
  t,
  appLocale,
}: BookingCardProps) {
  const bg = isDark ? '#262626' : '#f3f4f6';
  const fg = isDark ? '#fff' : '#000';
  const sub = isDark ? '#aaa' : '#666';
  const statusColor = STATUS_COLORS[item.status] ?? '#999';
  const highlightStyles = getStatusHighlightStyles(statusColor, isDark);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: highlighted ? highlightStyles.backgroundColor : bg,
          borderWidth: highlighted ? 1.5 : 0,
          borderColor: highlighted ? highlightStyles.borderColor : 'transparent',
          elevation: highlighted ? 4 : 1,
          shadowColor: highlighted ? highlightStyles.shadowColor : '#000',
          shadowOpacity: highlighted ? 0.18 : 0.07,
          shadowRadius: highlighted ? 12 : 8,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: getCarImage(item) }}
        style={styles.cardCarImage}
        resizeMode="cover"
      />
      <View style={styles.content}>
        {highlighted && badgeIsShow ? (
          <View style={[styles.highlightBadge, { backgroundColor: highlightStyles.badgeColor }]}>
            <Text style={styles.highlightBadgeText}>{t('reservations.highlightBadge')}</Text>
          </View>
        ) : null}
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardId, { color: sub }]} numberOfLines={1}>{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(STATUS_LABELS[item.status] ?? 'reservations.status.pending')}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardCarName, { color: fg }]} numberOfLines={1}>
          {item.car?.name ?? '—'}
        </Text>

        <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
          🕐 {fmtTime(item.departureAt, appLocale)}  ·  📅 {fmtDay(item.departureAt, appLocale)}
        </Text>

        <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
          📍 {item.departure?.label ?? '—'}
        </Text>
        {item.arrival?.label && item.arrival?.label !== 'N/A' ? (
          <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
            🏁 {item.arrival.label}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    marginHorizontal: 0,
    flexDirection: 'row',
    padding: 12,
  },
  content: { flex: 1, marginLeft: 12 },
  cardCarImage: { width: 100, height: 80, borderRadius: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardId: { fontSize: 10, flex: 1, marginRight: 6 },
  cardCarName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  cardMeta: { fontSize: 12, marginTop: 2 },
  highlightBadge: { alignSelf: 'flex-start', borderRadius: 999, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 4 },
  highlightBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
