import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useLayoutScale } from '@/lib/layout-scale';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type NotificationRouteField = {
  label: string;
  value: string;
};

export type NotificationDetailLine = {
  label: string;
  value: string;
};

export function NotificationCard({
  isDark,
  isUnread,
  title,
  subtitle,
  message,
  dateLabel,
  icon,
  tone,
  routeFields,
  detailLines,
  actionLabel,
  onOpenBooking,
}: {
  isDark: boolean;
  isUnread: boolean;
  title: string;
  subtitle: string;
  message: string;
  dateLabel: string;
  icon: IoniconName;
  tone: string;
  routeFields: NotificationRouteField[];
  detailLines: NotificationDetailLine[];
  actionLabel: string;
  onOpenBooking?: () => void;
}) {
  const { s, font } = useLayoutScale();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAction = typeof onOpenBooking === 'function';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#222733' : '#FFFFFF',
          borderColor: isUnread ? '#245EE8' : isDark ? '#384051' : '#E4E8F0',
          shadowColor: '#000000',
        },
      ]}>
      <View style={styles.headRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${tone}20` }]}>
          <Ionicons name={icon} size={s(16)} color={tone} />
        </View>

        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: isDark ? '#F0F3FB' : '#111827', fontSize: font.base }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            {isUnread ? <View style={styles.unreadDot} /> : null}
            <Text style={[styles.meta, { color: isDark ? '#B4BED0' : '#596579', fontSize: font.xs }]}>
              {subtitle}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.message, { color: isDark ? '#C7CFDC' : '#596579', fontSize: font.sm }]} numberOfLines={4}>
        {message}
      </Text>

      <Text style={[styles.date, { color: isDark ? '#E3E8F2' : '#374151', fontSize: font.sm }]}>
        {dateLabel}
      </Text>

      {routeFields.length > 0 ? (
        <View style={[styles.routeBlock, { borderLeftColor: isDark ? '#384051' : '#E4E8F0' }]}>
          {routeFields.map((field) => (
            <View key={`${field.label}-${field.value}`} style={styles.routeItem}>
              <Text style={[styles.routeLabel, { color: isDark ? '#B4BED0' : '#596579', fontSize: font.xs }]}>
                {field.label}
              </Text>
              <Text style={[styles.routeValue, { color: isDark ? '#F0F3FB' : '#111827', fontSize: font.sm }]} numberOfLines={3}>
                {field.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setIsExpanded((prev) => !prev);
            onOpenBooking?.();
          }}
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? '#293954' : '#EDF3FF' },
          ]}>
          <Text style={[styles.actionText, { color: '#245EE8', fontSize: font.sm }]}>{actionLabel}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={s(14)}
            color="#245EE8"
          />
        </Pressable>
      ) : null}

      {isExpanded && detailLines.length > 0 ? (
        <View style={[styles.detailBlock, { borderTopColor: isDark ? '#384051' : '#E4E8F0' }]}>
          {detailLines.map((line) => (
            <Text
              key={`${line.label}-${line.value}`}
              style={[styles.detailLine, { color: isDark ? '#B4BED0' : '#596579', fontSize: font.xs }]}>
              {line.label}: {line.value}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  } satisfies ViewStyle,
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  } satisfies ViewStyle,
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  headerContent: {
    flex: 1,
    minWidth: 0,
  } satisfies ViewStyle,
  title: {
    fontWeight: '600',
    lineHeight: 22,
  } satisfies TextStyle,
  meta: {
    marginTop: 1,
    fontWeight: '500',
  } satisfies TextStyle,
  metaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  } satisfies ViewStyle,
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#245EE8',
  } satisfies ViewStyle,
  message: {
    marginTop: 12,
    lineHeight: 20,
    fontWeight: '500',
  } satisfies TextStyle,
  date: {
    marginTop: 10,
    fontWeight: '700',
  } satisfies TextStyle,
  routeBlock: {
    marginTop: 14,
    marginLeft: 4,
    paddingLeft: 12,
    borderLeftWidth: 2,
    gap: 10,
  } satisfies ViewStyle,
  routeItem: {
    gap: 2,
  } satisfies ViewStyle,
  routeLabel: {
    fontWeight: '600',
  } satisfies TextStyle,
  routeValue: {
    lineHeight: 20,
    fontWeight: '500',
  } satisfies TextStyle,
  actionButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  } satisfies ViewStyle,
  actionText: {
    fontWeight: '700',
  } satisfies TextStyle,
  detailBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 4,
  } satisfies ViewStyle,
  detailLine: {
    lineHeight: 18,
    fontWeight: '500',
  } satisfies TextStyle,
});
