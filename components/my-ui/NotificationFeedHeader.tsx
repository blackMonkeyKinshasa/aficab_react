import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLayoutScale } from '@/lib/layout-scale';

export function NotificationFeedHeader({
  title,
  unreadSummary,
  hasUnread,
  markAllLabel,
  onMarkAllRead,
  isDark,
}: {
  title: string;
  unreadSummary: string;
  hasUnread: boolean;
  markAllLabel: string;
  onMarkAllRead: () => void;
  isDark: boolean;
}) {
  const { font } = useLayoutScale();

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827', fontSize: font.xl + 3 }]}>
          {title}
        </Text>
        {hasUnread ? (
          <Pressable accessibilityRole="button" onPress={onMarkAllRead} style={styles.markAsReadButton}>
            <Text
              style={[
                styles.markAsReadText,
                { color: '#245EE8', fontSize: font.sm },
              ]}>
              {markAllLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.subtitle, { color: isDark ? '#AEB8CA' : '#596579', fontSize: font.sm }]}>
        {unreadSummary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 2,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontWeight: '500',
  },
  markAsReadButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  markAsReadText: {
    fontWeight: '600',
  },
});
