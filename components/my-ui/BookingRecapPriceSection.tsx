import { Text, View } from 'react-native';

import { BookingRecapSectionHeader } from '@/components/my-ui/BookingRecapSectionHeader';
import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

export interface BookingRecapPriceLine {
  label: string;
  value: string;
}

interface BookingRecapPriceSectionProps {
  lines: BookingRecapPriceLine[];
  totalValue: string;
}

export function BookingRecapPriceSection({ lines, totalValue }: BookingRecapPriceSectionProps) {
  const { t } = useI18n();
  const { font } = useLayoutScale();

  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 bg-white p-4 dark:bg-[#1E1E1E]')}>
      <BookingRecapSectionHeader title={t('booking.totalTitle')} />

      {lines.map((line) => (
        <View key={line.label} className="mb-3 flex-row items-start justify-between gap-4">
          <Text className="flex-1 text-typography-600" style={{ fontSize: font.sm }}>
            {line.label}
          </Text>
          <Text className="font-medium text-typography-900" style={{ fontSize: font.sm }}>
            {line.value}
          </Text>
        </View>
      ))}

      <View className="my-3 border-t border-dashed border-outline-200" />

      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-typography-900" style={{ fontSize: font.base }}>
          {t('booking.totalToPay')}
        </Text>
        <Text className="font-bold text-primary" style={{ fontSize: font.xl }}>
          {totalValue}
        </Text>
      </View>
    </View>
  );
}
