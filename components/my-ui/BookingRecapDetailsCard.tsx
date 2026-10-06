import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { BookingRecapSectionHeader } from '@/components/my-ui/BookingRecapSectionHeader';
import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

export function BookingRecapDetailsCard({
  title,
  dateValue,
  pickupLabel,
  pickupPrimary,
  destinationLabel,
  destinationPrimary,
  onEditPress,
}: {
  title: string;
  dateValue: string;
  pickupLabel: string;
  pickupPrimary: string;
  destinationLabel?: string;
  destinationPrimary?: string;
  onEditPress?: () => void;
}) {
  const { font, s } = useLayoutScale();

  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 bg-white p-4 dark:bg-[#1E1E1E]')}>
      <BookingRecapSectionHeader title={title} onEditPress={onEditPress} />

      <View className="flex-row items-center">
        <Ionicons name="calendar-outline" size={s(18)} color="#6B7280" />
        <Text className="ml-2.5 text-typography-900" style={{ fontSize: font.base, fontWeight: '700' }}>
          {dateValue}
        </Text>
      </View>

      <View className="mt-3 flex-row">
        <View className="mr-2.5 items-center">
          <View
            className="rounded-full border-2 border-primary"
            style={{ width: s(12), height: s(12), backgroundColor: '#fff' }}
          />
          {destinationPrimary ? (
            <View
              className="my-0.5 w-0.5 flex-1 rounded-full bg-outline-200"
              style={{ minHeight: s(16) }}
            />
          ) : null}
          {destinationPrimary ? <Ionicons name="location" size={s(18)} color="#ff5705" /> : null}
        </View>

        <View className="flex-1">
          <Text className="text-typography-500" style={{ fontSize: font.xs }}>
            {pickupLabel}
          </Text>
          <Text
            className="text-typography-900"
            style={{ fontSize: font.sm, fontWeight: '600' }}
            numberOfLines={1}>
            {pickupPrimary}
          </Text>

          {destinationPrimary ? (
            <View className="mt-1.5">
              <Text className="text-typography-500" style={{ fontSize: font.xs }}>
                {destinationLabel}
              </Text>
              <Text
                className="text-typography-900"
                style={{ fontSize: font.sm, fontWeight: '600' }}
                numberOfLines={1}>
                {destinationPrimary}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
