import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';

export function BookingRecapPaymentSecurity() {
  const { t } = useI18n();
  const { font, s } = useLayoutScale();

  return (
    <View className="mb-4 rounded-2xl border border-outline-100 bg-white p-4 dark:bg-[#1E1E1E]">
      <View className="flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4ED]">
          <Ionicons name="wallet-outline" size={s(17)} color="#ff5705" />
        </View>
        <Text className="ml-3 font-bold text-typography-900" style={{ fontSize: font.base }}>
          {t('booking.acceptedPaymentMethods')}
        </Text>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <PaymentBadge label="Visa" />
        <PaymentBadge label="Mastercard" />
        <PaymentBadge label="M-Pesa" />
        <PaymentBadge label="Orange Money" />
        <PaymentBadge label="Airtel Money" />
      </View>
    </View>
  );
}

function PaymentBadge({ label }: { label: string }) {
  const { font } = useLayoutScale();

  return (
    <View className="rounded-md border border-outline-200 bg-white px-2 py-1 dark:bg-[#1E1E1E]">
      <Text className="font-semibold text-typography-700" style={{ fontSize: font.xs }}>
        {label}
      </Text>
    </View>
  );
}
