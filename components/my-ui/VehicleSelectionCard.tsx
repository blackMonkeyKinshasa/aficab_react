import { Image, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { color } from '@/constants/colors';
import { Car } from '@/constants/dataInterface';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x240';

interface VehicleSelectionCardProps {
  car: Car;
  isSelected: boolean;
  categoryUnavailableLabel: string;
  priceAmount: string;
  priceUnit: string;
  onPress: (car: Car) => void;
}

function SpecBadge({
  icon,
  label,
  badgeClassName,
}: {
  icon: 'person' | 'briefcase';
  label: string;
  badgeClassName: string;
}) {
  const { s, font } = useLayoutScale();
  const iconName = icon === 'person' ? 'person' : 'briefcase';
  const badge = s(24);

  return (
    <View className="flex-row items-center">
      <View
        className={cn('mr-2 items-center justify-center overflow-hidden rounded-md', badgeClassName)}
        style={{ width: badge, height: badge }}>
        <Ionicons name={iconName} size={s(18)} color="#6B7280" />
      </View>
      <Text className="text-typography-900" style={{ fontSize: font.md }}>
        {label}
      </Text>
    </View>
  );
}

export function VehicleSelectionCard({
  car,
  isSelected,
  categoryUnavailableLabel,
  priceAmount,
  priceUnit,
  onPress,
}: VehicleSelectionCardProps) {
  const { t } = useI18n();
  const { imageHeight, font } = useLayoutScale();
  const passengersLabel = `${car.seats} ${t('booking.passengers')}`;
  const baggageLabel = `${car.baggage} ${t('booking.baggageItems')}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(car)}
      className="mb-4 active:opacity-90">
      <View
        className={cn(
          bookingSheetCardClassName,
          'relative overflow-hidden bg-white p-4 dark:bg-[#1E1E1E]',
          isSelected && 'border-primary'
        )}
        style={{ borderWidth: isSelected ? 1.5 : 1 }}>
        {isSelected ? (
          <View className="absolute left-4 top-4 z-10 h-7 w-7 items-center justify-center rounded-full bg-primary">
            <Ionicons name="checkmark" size={18} color={color.white} />
          </View>
        ) : null}

        <View className="items-center overflow-hidden rounded-xl">
          <Image
            source={{ uri: car.images[0] ?? PLACEHOLDER_IMAGE }}
            style={{ width: '100%', height: imageHeight(180, 0.47, 340) }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-typography-900 mt-2 font-bold" style={{ fontSize: font.xl }}>
          {car.name}
        </Text>
        <Text className="text-typography-500 mt-0.5" style={{ fontSize: font.sm }}>
          {car.category?.name ?? categoryUnavailableLabel}
        </Text>

        <View className="mt-3 flex-row items-center gap-6">
          <SpecBadge icon="person" label={passengersLabel} badgeClassName="bg-transparent" />
          <SpecBadge icon="briefcase" label={baggageLabel} badgeClassName="bg-transparent" />
        </View>

        <View className="mt-4 border-t border-outline-100 pt-3">
          <View className="flex-row items-baseline">
          <Text className="font-bold text-primary" style={{ fontSize: font.xl }}>
            {priceAmount}
          </Text>
          <Text className="text-typography-500 ml-1 font-medium" style={{ fontSize: font.sm }}>
            {priceUnit}
          </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
