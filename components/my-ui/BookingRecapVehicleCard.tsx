import { Image, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
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
  return (
    <View className="flex-row items-center">
      <View
        className={cn(
          'mr-1.5 h-6 w-6 items-center justify-center overflow-hidden rounded-md',
          badgeClassName
        )}>
        <Ionicons name={icon} size={12} color="#ffffff" />
      </View>
      <Text className="text-typography-900 text-sm">{value}</Text>
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
}: BookingRecapVehicleCardProps) {
  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 flex-row items-center p-2')}>
      <Image
        source={{ uri: imageUri || PLACEHOLDER_IMAGE }}
        style={vehicleCardStyles.image}
        resizeMode="cover"
      />

      <View className="min-w-0 flex-1 pl-3">
        <Text className="text-typography-900 text-base font-bold" numberOfLines={2}>
          {name}
        </Text>
        <Text className="text-typography-500 mt-0.5 text-sm" numberOfLines={1}>
          {category}
        </Text>

        <View className="mt-2 flex-row items-center gap-4">
          <SpecBadge icon="person" value={seats} badgeClassName="bg-info-200" />
          <SpecBadge icon="briefcase" value={baggage} badgeClassName="bg-warning-200" />

          <View className="ml-auto flex-row items-baseline">
            <Text className="text-base font-semibold">{priceAmount}</Text>
            {priceUnit ? (
              <Text className="text-typography-500 ml-0.5 text-sm">{priceUnit}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const vehicleCardStyles = StyleSheet.create({
  image: {
    width: 150,
    height: 100,
    borderRadius: 12,
  },
});
