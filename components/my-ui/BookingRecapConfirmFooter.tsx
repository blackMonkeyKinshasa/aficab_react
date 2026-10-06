import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Button, ButtonText } from '@/components/ui/button';
import { color } from '@/constants/colors';
import { controlHeightStyle } from '@/constants/spacing';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

export function BookingRecapConfirmFooter({
  totalLabel,
  onPress,
}: {
  totalLabel: string;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  return (
    <View>
      <Button
        action="primary"
        variant="solid"
        size="control"
        className="w-full rounded-xl"
        style={controlHeightStyle}
        onPress={onPress}>
        <View className="flex-row items-center justify-center">
          <Ionicons name="lock-closed" size={s(16)} color={color.white} />
          <ButtonText className="mx-2 text-white">
            {t('booking.confirmAndPay')} • {totalLabel}
          </ButtonText>
          <Ionicons name="chevron-forward" size={s(16)} color={color.white} />
        </View>
      </Button>

      <View className="mt-3 flex-row items-center justify-center">
        <Ionicons name="shield-checkmark-outline" size={s(14)} color="#6B7280" />
        <Text className="ml-1.5 text-typography-500" style={{ fontSize: font.xs }}>
          {t('booking.paymentFullySecure')}
        </Text>
      </View>
    </View>
  );
}
