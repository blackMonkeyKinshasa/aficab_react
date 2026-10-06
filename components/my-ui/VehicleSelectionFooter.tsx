import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  SUPPORT_EMAIL_URL,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP_URL,
} from '@/constants/databaseEnum';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

function QualityItem({ label }: { label: string }) {
  const { font, s } = useLayoutScale();

  return (
    <View className="mb-2 w-1/2 flex-row items-center pr-2">
      <Ionicons name="checkmark-circle" size={s(16)} color={color.primary} />
      <Text className="ml-2 flex-1 text-typography-700" style={{ fontSize: font.sm }}>
        {label}
      </Text>
    </View>
  );
}

export function VehicleSelectionFooter() {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  const handleContactSupport = () => {
    Alert.alert(t('settings.contactUs'), t('auth.supportMessage'), [
      { text: t('settings.whatsapp'), onPress: () => Linking.openURL(SUPPORT_WHATSAPP_URL) },
      { text: t('settings.call'), onPress: () => Linking.openURL(`tel:${SUPPORT_PHONE}`) },
      { text: t('settings.email'), onPress: () => Linking.openURL(SUPPORT_EMAIL_URL) },
      { text: t('common.cancel'), style: 'cancel' },
    ], { cancelable: true });
  };

  const qualities = [
    t('booking.vehiclesQualityAirConditioned'),
    t('booking.vehiclesQualityInsured'),
    t('booking.vehiclesQualityMaintained'),
    t('booking.vehiclesQualityComfortable'),
  ];

  return (
    <View className="mt-2">
      <View
        className="rounded-2xl border border-primary/20 bg-[#FFF4ED] px-4 py-4 dark:border-primary/30 dark:bg-[#2A221C]"
        style={{ borderWidth: 1 }}>
        <View className="flex-row items-center">
          <Ionicons name="shield-checkmark" size={s(20)} color={color.primary} />
          <Text className="ml-2 font-semibold text-typography-900" style={{ fontSize: font.sm }}>
            {t('booking.vehiclesQualityTitle')}
          </Text>
        </View>
        <View className="mt-3 flex-row flex-wrap">
          {qualities.map((label) => (
            <QualityItem key={label} label={label} />
          ))}
        </View>
      </View>

      <PressableSupportLink onPress={handleContactSupport} />
    </View>
  );
}

function PressableSupportLink({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="mt-6 items-center pb-2 active:opacity-80">
      <View className="flex-row items-center">
        <Ionicons name="headset-outline" size={s(16)} color="#6B7280" />
        <Text className="ml-1.5 text-typography-500" style={{ fontSize: font.sm }}>
          {t('auth.needHelp')}{' '}
          <Text className="font-semibold text-primary">{t('settings.contactUs')}</Text>
        </Text>
      </View>
    </Pressable>
  );
}
