import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { useI18n } from '@/lib/i18n';

 type Props =  {
  isDark: boolean;
  title?: string;
  description?: string;
}

export function ErrorEmpty({isDark, title, description} :Props) {
  const { t } = useI18n();

  return (
    <View className="flex flex-col items-center justify-center w-full">
      <Image source={require('@/assets/images/sports_car-bro.svg')}        style={{ width: 300, height: 300, resizeMode: 'contain', marginBottom: 20 }}
        />
      <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#f3f4f6' : '#111827', textAlign: 'center' }}>
        {title ?? t('reservations.empty')}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '400', color: isDark ? '#aaa' : '#555', textAlign: 'center', marginTop: 8, maxWidth: 320 }}>
        {description ?? t('reservations.empty')}
      </Text>
    </View>
  );
}