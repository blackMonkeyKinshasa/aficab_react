import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface BookingRecapImportantInfoItem {
  icon: IoniconName;
  text: string;
}

export function BookingRecapImportantInfoCard({ items }: { items: BookingRecapImportantInfoItem[] }) {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      className="mb-4 rounded-2xl border border-primary/20 bg-[#FFF4ED] p-4 dark:border-primary/30 dark:bg-[#2A221C]"
      style={{ borderWidth: 1 }}>
      <View className="mb-3 flex-row items-center">
        <Ionicons name="information-circle" size={s(20)} color={color.primary} />
        <Text className="ml-2 font-bold text-primary" style={{ fontSize: font.sm }}>
          {t('booking.importantInfoTitle')}
        </Text>
      </View>

      {items.map((item) => (
        <View key={item.text} className="mb-2 flex-row items-start last:mb-0">
          <Ionicons name={item.icon} size={s(16)} color={color.primary} style={{ marginTop: 2 }} />
          <Text className="ml-2 flex-1 text-typography-700" style={{ fontSize: font.sm }}>
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
