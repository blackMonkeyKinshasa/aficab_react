import { Text, View } from 'react-native';

import { BookingRecapDetailRow } from '@/components/my-ui/BookingRecapDetailRow';
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

      <View className="border-outline-100 my-3 border-t" />

      <View className="flex-row items-center justify-between">
        <Text className="text-typography-900 text-base font-bold">{totalLabel}</Text>
        <Text className="text-typography-900 text-base font-bold">{totalValue}</Text>
      </View>
    </BookingRecapSection>
  );
}
