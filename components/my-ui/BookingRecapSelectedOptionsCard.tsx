import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface BookingRecapSelectedOption {
  icon: IoniconName;
  title: string;
  description?: string;
  priceLabel: string;
}

export function BookingRecapSelectedOptionsCard({ options }: { options: BookingRecapSelectedOption[] }) {
  const { tf } = useI18n();
  const { font, s } = useLayoutScale();

  if (options.length === 0) {
    return null;
  }

  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 bg-white p-4 dark:bg-[#1E1E1E]')}>
      <Text className="mb-4 font-bold text-typography-900" style={{ fontSize: font.base }}>
        {tf('booking.selectedOptionsTitle', { count: options.length })}
      </Text>

      {options.map((option, index) => (
        <View
          key={option.title}
          className={cn('flex-row items-start', index > 0 && 'mt-4 border-t border-outline-100 pt-4')}>
          <View
            className="items-center justify-center rounded-full bg-[#FFF4ED]"
            style={{ width: s(36), height: s(36) }}>
            <Ionicons name={option.icon} size={s(18)} color="#ff5705" />
          </View>

          <View className="ml-3 flex-1">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 font-semibold text-typography-900" style={{ fontSize: font.sm }}>
                {option.title}
              </Text>
              <Text className="font-semibold text-typography-900" style={{ fontSize: font.sm }}>
                {option.priceLabel}
              </Text>
            </View>
            {option.description ? (
              <Text className="mt-1 text-typography-500" style={{ fontSize: font.xs }}>
                {option.description}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
