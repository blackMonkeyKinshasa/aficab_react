import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useLayoutScale } from '@/lib/layout-scale';

interface BookingRecapDetailRowProps {
  label: string;
  value: string;
  hasDots?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export function BookingRecapDetailColumn({
  label,
  value,
  hasDots = false,
  icon = 'information-circle-outline',
}: BookingRecapDetailRowProps) {
  const { s, font } = useLayoutScale();

  return (
    <View className="flex-row items-center border-b border-outline-100 py-3 last:border-b-0">
      <View className="mr-3 items-center justify-center">
        <Ionicons name={icon} size={s(23)} color="#6B7280" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-typography-500" style={{ fontSize: font.xs }}>
          {label} {hasDots && ':'}
        </Text>
        <Text className="mt-0.5 font-semibold text-typography-900" style={{ fontSize: font.sm }}>
          {value}
        </Text>
      </View>
    </View>
  );
}


export function BookingRecapDetailRow({ label, value, hasDots = false }: BookingRecapDetailRowProps) {
  const { font } = useLayoutScale();

  return (
    <View className="mb-3 items-start flex-row justify-between ">
      <Text className="text-typography-500 max-w-[50%] shrink-0" style={{ fontSize: font.sm }}>
        {label} {hasDots && ':'}
      </Text>
      <Text className="text-typography-900 align-end font-medium" style={{ fontSize: font.sm }}>
        {value}
      </Text>
    </View>
  );
}
