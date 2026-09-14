import { Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

export function BookingStepHeader({
  current,
  subtitle,
}: {
  current: 1 | 2 | 3 | 4;
  subtitle: string;
}) {
  const { tf } = useI18n();
  const { font } = useLayoutScale();

  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-4">
        <Text className="text-typography-500" style={{ fontSize: font.sm }}>
          {tf('booking.stepProgress', { current, total: 4 })}
        </Text>
        <View className="h-1 flex-1 overflow-hidden rounded-full bg-outline-100">
          <View className="h-full rounded-full bg-primary" style={{ width: `${current * 25}%` }} />
        </View>
      </View>
      <Text className="mt-3 text-typography-500" style={{ fontSize: font.sm }}>
        {subtitle}
      </Text>
    </View>
  );
}
