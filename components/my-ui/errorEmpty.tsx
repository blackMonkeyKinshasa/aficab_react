import { Text, View } from 'react-native';

import { Image } from 'expo-image';

import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

type Props = {
  isDark: boolean;
  title?: string;
  description?: string;
};

export function ErrorEmpty({ isDark, title, description }: Props) {
  const { t } = useI18n();
  const { s, font } = useLayoutScale();
  const illustration = s(300);

  return (
    <View className="flex w-full flex-col items-center justify-center">
      <Image
        source={require('@/assets/images/sports_car-bro.svg')}
        style={{ width: illustration, height: illustration, marginBottom: 20 }}
        contentFit="contain"
      />
      <Text
        style={{
          fontSize: font.base,
          fontWeight: '600',
          color: isDark ? '#f3f4f6' : '#111827',
          textAlign: 'center',
        }}>
        {title ?? t('reservations.empty')}
      </Text>
      <Text
        style={{
          fontSize: font.sm,
          fontWeight: '400',
          color: isDark ? '#aaa' : '#555',
          textAlign: 'center',
          marginTop: 8,
          maxWidth: s(320),
        }}>
        {description ?? t('reservations.empty')}
      </Text>
    </View>
  );
}
