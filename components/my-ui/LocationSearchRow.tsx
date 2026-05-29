import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';

import { color } from '@/constants/colors';
import { useFieldThemeColors } from '@/lib/field-theme';
import { cn } from '@/lib/utils';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface LocationSearchRowProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  icon?: 'navigate' | 'location';
  trailing?: ReactNode;
  className?: string;
}

export function LocationSearchRowContent({
  title,
  subtitle,
  icon = 'location',
  trailing,
  useThemeColors = false,
}: Omit<LocationSearchRowProps, 'onPress' | 'className'> & { useThemeColors?: boolean }) {
  const iconName: IoniconName = icon === 'navigate' ? 'navigate' : 'location';
  const themeColors = useFieldThemeColors();

  const titleStyle = useThemeColors ? { color: themeColors.listItemText } : undefined;
  const subtitleStyle = useThemeColors ? { color: themeColors.listItemSubText } : undefined;

  return (
    <>
      <Ionicons name={iconName} size={22} color={color.primary} style={{ marginRight: 12 }} />
      <View className="min-w-0 flex-1 shrink">
        <Text
          className="text-typography-900 text-base font-semibold"
          style={titleStyle}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-typography-500 mt-0.5 text-sm"
            style={subtitleStyle}
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );
}

export function LocationSearchRow({
  title,
  subtitle,
  onPress,
  icon = 'location',
  trailing,
  className,
}: LocationSearchRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('flex-row items-center py-3', className)}
      accessibilityRole="button">
      <LocationSearchRowContent title={title} subtitle={subtitle} icon={icon} trailing={trailing} />
    </Pressable>
  );
}

export function LocationSectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-typography-400 pb-1 pt-3 text-xs font-medium uppercase tracking-wider">
      {children}
    </Text>
  );
}
