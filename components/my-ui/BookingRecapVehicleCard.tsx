import { Image, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x240';

interface BookingRecapVehicleCardProps {
  imageUri: string;
  name: string;
  category: string;
  seats: number;
  baggage: number;
  priceAmount: string;
  priceUnit?: string;
  durationLabel?: string;
}

function SpecBadge({
  icon,
  value,
  badgeClassName,
}: {
  icon: 'person' | 'briefcase';
  value: number;
  badgeClassName: string;
}) {
  const { s, font } = useLayoutScale();
  const badge = s(24);

  return (
    <View className="flex-row items-center">
      <View
        className={cn('mr-1.5 items-center justify-center overflow-hidden rounded-md', badgeClassName)}
        style={{ width: badge, height: badge }}>
        <Ionicons name={icon} size={s(12)} color="#ffffff" />
      </View>
      <Text className="text-typography-900" style={{ fontSize: font.sm }}>
        {value}
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
  priceAmount,
  priceUnit,
  durationLabel,
}: BookingRecapVehicleCardProps) {
  const { imageHeight, s, font } = useLayoutScale();

  return (
    <View
      className={cn(
        bookingSheetCardClassName,
        'mb-4 overflow-hidden bg-white p-4 dark:bg-[#1E1E1E]'
      )}>
      <Image
        source={{ uri: imageUri || PLACEHOLDER_IMAGE }}
        style={{ width: '100%', height: imageHeight(180, 0.46, 320), borderRadius: 12 }}
        resizeMode="contain"
      />

      <View className="mt-2">
        <Text className="font-bold text-typography-900" style={{ fontSize: font.lg }} numberOfLines={2}>
          {name}
        </Text>
        <Text className="mt-0.5 text-typography-500" style={{ fontSize: font.sm }} numberOfLines={1}>
          {category}
        </Text>

        <View className="mt-3 flex-row items-center gap-5">
          {durationLabel ? (
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={s(18)} color="#6B7280" />
              <Text className="ml-2 text-typography-600" style={{ fontSize: font.sm }}>
                {durationLabel}
              </Text>
            </View>
          ) : null}
          <SpecBadge icon="person" value={seats} badgeClassName="bg-info-200" />
          <SpecBadge icon="briefcase" value={baggage} badgeClassName="bg-warning-200" />
        </View>

        <View className="mt-3 flex-row items-baseline border-t border-outline-100 pt-3">
            <Text className="font-semibold text-primary" style={{ fontSize: font.base }}>
              {priceAmount}
            </Text>
            {priceUnit ? (
              <Text className="ml-1 text-typography-500" style={{ fontSize: font.sm }}>
                {priceUnit}
              </Text>
            ) : null}
        </View>
      </View>
    </View>
  );
}
