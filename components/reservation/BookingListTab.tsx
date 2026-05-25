import { useEffect, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Booking } from '@/constants/dataInterface';
import { TranslationKey } from '@/lib/i18n';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';

import { BookingCard } from './BookingCard';

type BookingListTabProps = {
  bookings: Booking[];
  isDark: boolean;
  activeHighlightId: string | null;
  rawShowBadge: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectBooking: (booking: Booking) => void;
  t: (key: TranslationKey) => string;
  appLocale: string;
  emptyTitleKey: TranslationKey;
  emptyDescriptionKey: TranslationKey;
};

export function BookingListTab({
  bookings,
  isDark,
  activeHighlightId,
  rawShowBadge,
  refreshing,
  onRefresh,
  onSelectBooking,
  t,
  appLocale,
  emptyTitleKey,
  emptyDescriptionKey,
}: BookingListTabProps) {
  const listRef = useRef<FlatList<Booking>>(null);

  useEffect(() => {
    if (!activeHighlightId || bookings.length === 0) {
      return;
    }

    const highlightedIndex = bookings.findIndex((booking) => booking.id === activeHighlightId);
    if (highlightedIndex < 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      listRef.current?.scrollToIndex({
        animated: true,
        index: highlightedIndex,
        viewPosition: 0.2,
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [activeHighlightId, bookings]);

  return (
    <FlatList
      ref={listRef}
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FE5900"
          colors={['#FE5900']}
        />
      }
      onScrollToIndexFailed={({ averageItemLength, index }) => {
        listRef.current?.scrollToOffset({
          animated: true,
          offset: averageItemLength * index,
        });
      }}
      renderItem={({ item }) => (
        <BookingCard
          item={item}
          isDark={isDark}
          highlighted={item.id === activeHighlightId}
          badgeIsShow={rawShowBadge}
          onPress={() => onSelectBooking(item)}
          t={t}
          appLocale={appLocale}
        />
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <ErrorEmpty
          isDark={isDark}
          title={t(emptyTitleKey)}
          description={t(emptyDescriptionKey)}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  separator: { height: 20 },
});
