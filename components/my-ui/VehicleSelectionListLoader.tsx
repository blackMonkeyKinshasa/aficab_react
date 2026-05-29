import { ActivityIndicator, View } from 'react-native';

import { color } from '@/constants/colors';
import { cn } from '@/lib/utils';

interface VehicleSelectionListLoaderProps {
  compact?: boolean;
}

export function VehicleSelectionListLoader({ compact = false }: VehicleSelectionListLoaderProps) {
  return (
    <View className={cn('items-center justify-center', compact ? 'py-6' : 'py-16')}>
      <ActivityIndicator size="large" color={color.primary} />
    </View>
  );
}
