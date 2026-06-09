import { Text, View } from 'react-native';

import { BookingRecapDetailRow } from '@/components/my-ui/BookingRecapDetail';
import { BookingRecapSection } from '@/components/my-ui/BookingRecapSection';

export interface BookingRecapPriceLine {
  label: string;
  value: string;
  emphasized?: boolean;
}

interface BookingRecapPriceSectionProps {
  title: string;
  lines: BookingRecapPriceLine[];
  totalLabel: string;
  totalValue: string;
}

export function BookingRecapPriceSection({
  title,
  lines,
  totalLabel,
  totalValue,
}: BookingRecapPriceSectionProps) {
  return (
    <BookingRecapSection title={title}>
      {lines.map((line) => (
        <BookingRecapDetailRow key={line.label} label={line.label} value={line.value} />
      ))}

      <View className="my-3 border-t border-outline-100" />

      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-typography-900">{totalLabel}</Text>
        <Text className="text-base font-bold text-typography-900">{totalValue}</Text>
      </View>
    </BookingRecapSection>
  );
}
