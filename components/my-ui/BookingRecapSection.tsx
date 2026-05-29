import { Text, View } from 'react-native';

import type { ReactNode } from 'react';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
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
  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 p-5', className)}>
      {title ? <Text className="text-typography-900 mb-4 text-base font-bold">{title}</Text> : null}
      {children}
      {showDivider ? <View className="border-outline-100 mt-1 border-t" /> : null}
    </View>
  );
}
