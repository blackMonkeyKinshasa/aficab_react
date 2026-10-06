import { Image, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x240';

interface BookingRecapVehicleCardProps {
  imageUri: string;
  name: string;
  category: string;
  seats: number;
  baggage: number;
}

function SpecItem({ icon, label }: { icon: 'person' | 'briefcase' | 'snow'; label: string }) {
  const { s, font } = useLayoutScale();
  const iconName =
    icon === 'person' ? 'person-outline' : icon === 'briefcase' ? 'briefcase-outline' : 'snow-outline';

  return (
    <View className="flex-row items-center">
      <Ionicons name={iconName} size={s(14)} color="#6B7280" />
      <Text className="ml-1.5 text-typography-700" style={{ fontSize: font.sm }}>
        {label}
      </Text>
    </View>
  );
}

export function BookingRecapVehicleCard({
  imageUri,
  name,
  category,
  seats,
  baggage,
}: BookingRecapVehicleCardProps) {
  const { t } = useI18n();
  const { s, font } = useLayoutScale();
  const imageWidth = s(112);
  const imageHeight = s(72);

  return (
    <View
      className={cn(
        bookingSheetCardClassName,
        'mb-4 overflow-hidden bg-white p-4 dark:bg-[#1E1E1E]'
      )}>
      <View className="flex-row gap-3">
        <View
          className="items-center justify-center overflow-hidden rounded-lg"
          style={{ width: imageWidth, height: imageHeight }}>
          <Image
            source={{ uri: imageUri || PLACEHOLDER_IMAGE }}
            style={{ width: imageWidth, height: imageHeight }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-1 justify-center">
          <Text className="font-bold text-typography-900" style={{ fontSize: font.lg }} numberOfLines={2}>
            {name}
          </Text>
          <Text className="mt-0.5 text-typography-500" style={{ fontSize: font.sm }} numberOfLines={1}>
            {category}
          </Text>

          <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
            <SpecItem icon="person" label={`${seats} ${t('booking.passengers')}`} />
            <SpecItem icon="briefcase" label={`${baggage} ${t('booking.baggageItems')}`} />
            <SpecItem icon="snow" label={t('booking.airConditioning')} />
          </View>
        </View>
      </View>
    </View>
  );
}
