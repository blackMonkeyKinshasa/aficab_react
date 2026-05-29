import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { color } from '@/constants/colors';
import { Car } from '@/constants/dataInterface';
import { useI18n } from '@/lib/i18n';
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
  const iconName = icon === 'person' ? 'person' : 'briefcase';

  return (
    <View className="flex-row items-center">
      <View
        className={cn(
          'mr-2 h-6 w-6 items-center justify-center overflow-hidden rounded-md',
          badgeClassName
        )}>
        <Ionicons name={iconName} size={14} color={color.white} />
      </View>
      <Text className="text-typography-900 text-[15px]">{label}</Text>
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
  const passengersLabel = `${car.seats} ${t('booking.passengers')}`;
  const baggageLabel = `${car.baggage} ${t('booking.baggageItems')}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(car)}
      className="mb-4 active:opacity-90">
      <View
        className={cn(bookingSheetCardClassName, 'p-5', isSelected && 'border-2 border-primary')}>
        <Text className="text-typography-900 text-[22px] font-bold">{car.name}</Text>

        <Text className="text-typography-500 mt-0.5 text-[15px]">
          {car.category?.name ?? categoryUnavailableLabel}
        </Text>

        <View className="mt-2 flex-row items-center gap-5">
          <SpecBadge icon="person" label={passengersLabel} badgeClassName="bg-info-200" />
          <SpecBadge icon="briefcase" label={baggageLabel} badgeClassName="bg-warning-200" />
        </View>

        <View className="mt-4 items-center overflow-hidden rounded-lg">
          <Image
            source={{ uri: car.images[0] ?? PLACEHOLDER_IMAGE }}
            style={vehicleCardStyles.image}
            resizeMode="cover"
          />
        </View>

        <View className="mt-2 flex-row items-baseline">
          <Text className="text-[32px] font-bold leading-9 text-primary">{priceAmount}</Text>
          <Text className="ml-0.5 text-lg font-bold leading-9 text-primary">{priceUnit}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const vehicleCardStyles = StyleSheet.create({
  image: {
    width: '100%',
    height: 200,
  },
});
