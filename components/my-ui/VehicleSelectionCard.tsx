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

function SpecItem({
  icon,
  label,
  showInfo,
}: {
  icon: 'person' | 'briefcase' | 'person-check';
  label: string;
  showInfo?: boolean;
}) {
  const { s, font } = useLayoutScale();

  return (
    <View className="flex-row items-center">
      {icon === 'person-check' ? (
        <View className="flex-row items-center">
          <Ionicons name="person" size={s(14)} color="#6B7280" />
          <Ionicons name="checkmark" size={s(10)} color={color.primary} style={{ marginLeft: -2 }} />
        </View>
      ) : (
        <Ionicons
          name={icon === 'person' ? 'person-outline' : 'briefcase-outline'}
          size={s(14)}
          color="#6B7280"
        />
      )}
      <Text className="ml-2 text-typography-700" style={{ fontSize: font.sm }}>
        {label}
      </Text>
      {showInfo ? (
        <Ionicons
          name="information-circle-outline"
          size={s(14)}
          color="#9CA3AF"
          style={{ marginLeft: 4 }}
        />
      ) : null}
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
  const { s, font } = useLayoutScale();
  const imageWidth = s(112);
  const imageHeight = s(72);
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
          'relative overflow-hidden bg-white p-3 dark:bg-[#1E1E1E]',
          isSelected && 'border-primary'
        )}
        style={{ borderWidth: isSelected ? 1.5 : 1 }}>
        <View className="flex-row gap-3">
          <View
            className="items-center justify-center overflow-hidden rounded-lg"
            style={{ width: imageWidth, height: imageHeight }}>
            <Image
              source={{ uri: car.images[0] ?? PLACEHOLDER_IMAGE }}
              style={{ width: imageWidth, height: imageHeight }}
              resizeMode="contain"
            />
          </View>

          <View className="flex-1 justify-center">
            <Text className="font-bold text-typography-900" style={{ fontSize: font.lg }}>
              {car.name}
            </Text>
            <Text className="mt-0.5 text-typography-500" style={{ fontSize: font.sm }}>
              {car.category?.name ?? categoryUnavailableLabel}
            </Text>

            <View className="mt-2 gap-1.5">
              <SpecItem icon="person" label={passengersLabel} />
              <SpecItem icon="briefcase" label={baggageLabel} />
              <SpecItem icon="person-check" label={t('booking.driverIncluded')} showInfo />
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row items-end">
          <View className="flex-row items-baseline">
            <Text className="font-bold text-primary" style={{ fontSize: font.xl }}>
              {priceAmount}
            </Text>
            <Text className="ml-1 font-medium text-typography-500" style={{ fontSize: font.sm }}>
              {priceUnit}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
