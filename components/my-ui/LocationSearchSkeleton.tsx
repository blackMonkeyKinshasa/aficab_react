import { View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { translateCurrent } from '@/lib/i18n';

const SKELETON_ROW_COUNT = 3;

function LocationSearchSkeletonRow() {
  return (
    <View className="flex-row items-center py-3">
      <Skeleton className="h-[22px] w-[22px] rounded-full bg-muted" />
      <View className="ml-3 min-w-0 flex-1 gap-2">
        <Skeleton className="h-4 rounded-md bg-muted" style={{ width: '72%' }} />
        <Skeleton className="h-3 rounded-md bg-muted" style={{ width: '88%' }} />
      </View>
    </View>
  );
}

export function LocationSearchSkeleton() {
  return (
    <View
      accessibilityLabel={translateCurrent('notifications.loadingSearchResults')}
      accessibilityRole="progressbar">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <LocationSearchSkeletonRow key={`location-skeleton-${index}`} />
      ))}
    </View>
  );
}
