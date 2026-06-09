import { Pressable, Text, View } from 'react-native';

import type { ReactNode } from 'react';

import { bookingSheetCardClassName } from '@/components/my-ui/BookingSheetLayout';
import { cn } from '@/lib/utils';

interface BookingOptionSectionCardProps {
  title?: string;
  description?: string;
  header?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function BookingOptionSectionCard({
  title,
  description,
  header,
  children,
  className,
}: BookingOptionSectionCardProps) {
  const hasDefaultHeader = Boolean(title || description);

  return (
    <View className={cn(bookingSheetCardClassName, 'mb-4 p-5', className)}>
      {header ??
        (hasDefaultHeader ? (
          <View className="mb-4">
            {title ? <Text className="text-typography-900 text-lg font-bold">{title}</Text> : null}
            {description ? (
              <Text className="text-typography-500 mt-2 text-sm">{description}</Text>
            ) : null}
          </View>
        ) : null)}
      {children}
    </View>
  );
}

interface BookingOptionSectionHeaderProps {
  title: string;
  description?: string;
  right?: ReactNode;
  onPress?: () => void;
}

export function BookingOptionSectionHeader({
  title,
  description,
  right,
  onPress,
}: BookingOptionSectionHeaderProps) {
  const content = (
    <>
      <View className="min-w-0 flex-1 pr-3">
        <Text className="text-typography-900 text-lg font-bold">{title}</Text>
        {description ? (
          <Text className="text-typography-500 mt-2 text-sm">{description}</Text>
        ) : null}
      </View>
      {right}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="mb-4 flex-row items-start active:opacity-80">
        {content}
      </Pressable>
    );
  }

  return <View className="mb-4 flex-row items-start">{content}</View>;
}
