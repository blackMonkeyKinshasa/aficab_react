import { Pressable, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useFieldThemeColors } from '@/lib/field-theme';
import { translateCurrent } from '@/lib/i18n';

interface BookingTripSummaryCardProps {
  children: ReactNode;
  onEditPress: () => void;
}

export function BookingTripSummaryCard({ children, onEditPress }: BookingTripSummaryCardProps) {
  const themeColors = useFieldThemeColors();

  return (
    <View
      className={`${bookingSheetCardClassName} mb-4 flex-row items-center bg-white p-4 dark:bg-[#1E1E1E]`}>
      <View className="min-w-0 flex-1 pr-3">{children}</View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translateCurrent('booking.editTrip')}
        onPress={onEditPress}
        hitSlop={8}
        className="active:opacity-70">
        <Ionicons name="pencil" size={20} color={themeColors.listItemText} />
      </Pressable>
    </View>
  );
}
