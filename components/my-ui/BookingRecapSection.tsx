import { Text, View } from 'react-native';

import type { ReactNode } from 'react';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

interface BookingRecapSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  showDivider?: boolean;
}

export function BookingRecapSection({
  title,
  children,
  className,
  showDivider = false,
}: BookingRecapSectionProps) {
  const { font } = useLayoutScale();

  return (
    <View
      className={cn(
        bookingSheetCardClassName,
        'mb-4 bg-white p-5 dark:bg-[#1E1E1E]',
        className
      )}>
      {title ? (
        <Text className="text-typography-900 mb-4 font-bold" style={{ fontSize: font.base }}>
          {title}
        </Text>
      ) : null}
      {children}
      {showDivider ? <View className="border-outline-100 mt-1 border-t" /> : null}
    </View>
  );
}
