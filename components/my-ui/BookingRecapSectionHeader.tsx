import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

export function BookingRecapSectionHeader({
  title,
  onEditPress,
}: {
  title: string;
  onEditPress?: () => void;
}) {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  return (
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="font-bold text-typography-900" style={{ fontSize: font.base }}>
        {title}
      </Text>
      {onEditPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onEditPress}
          className="flex-row items-center active:opacity-80">
          <Ionicons name="create-outline" size={s(16)} color={color.primary} />
          <Text className="ml-1 font-semibold text-primary" style={{ fontSize: font.sm }}>
            {t('booking.edit')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
