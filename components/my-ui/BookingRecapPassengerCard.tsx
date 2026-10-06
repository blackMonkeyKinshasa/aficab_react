import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { BookingRecapSectionHeader } from '@/components/my-ui/BookingRecapSectionHeader';
import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

export function BookingRecapPassengerCard({
  name,
  phone,
  email,
  onEditPress,
}: {
  name: string;
  phone?: string;
  email?: string;
  onEditPress?: () => void;
}) {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 bg-white p-4 dark:bg-[#1E1E1E]')}>
      <BookingRecapSectionHeader title={t('booking.passengerInfoTitle')} onEditPress={onEditPress} />

      <View className="flex-row items-start">
        <View
          className="items-center justify-center rounded-full bg-outline-100"
          style={{ width: s(48), height: s(48) }}>
          <Ionicons name="person" size={s(24)} color="#9CA3AF" />
        </View>

        <View className="ml-3 flex-1">
          <Text className="font-bold text-typography-900" style={{ fontSize: font.base }}>
            {name}
          </Text>
          {phone ? (
            <View className="mt-2 flex-row items-center">
              <Ionicons name="call-outline" size={s(14)} color="#6B7280" />
              <Text className="ml-2 text-typography-700" style={{ fontSize: font.sm }}>
                {phone}
              </Text>
            </View>
          ) : null}
          {email ? (
            <View className="mt-1.5 flex-row items-center">
              <Ionicons name="mail-outline" size={s(14)} color="#6B7280" />
              <Text className="ml-2 text-typography-700" style={{ fontSize: font.sm }}>
                {email}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
