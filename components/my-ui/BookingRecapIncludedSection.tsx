import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

export function BookingRecapIncludedSection({ items }: { items: string[] }) {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  if (items.length === 0) {
    return null;
  }

  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 bg-white p-4 dark:bg-[#1E1E1E]')}>
      <Text className="mb-3 font-bold text-typography-900" style={{ fontSize: font.base }}>
        {t('booking.includedInReservation')}
      </Text>

      {items.map((item) => (
        <View key={item} className="mb-2 flex-row items-start">
          <Ionicons name="checkmark-circle" size={s(18)} color="#16A34A" />
          <Text className="ml-2 flex-1 text-typography-700" style={{ fontSize: font.sm }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
