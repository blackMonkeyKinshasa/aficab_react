import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { Switch } from '@/components/ui/switch';
import { useFieldThemeColors } from '@/lib/field-theme';
import { translateCurrent } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

interface BookingOptionToggleRowProps {
  title: string;
  description?: string;
  priceLabel: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onInfoPress?: () => void;
  showDivider?: boolean;
}

export function BookingOptionToggleRow({
  title,
  description,
  priceLabel,
  icon = 'add-outline',
  checked,
  onCheckedChange,
  onInfoPress,
  showDivider = false,
}: BookingOptionToggleRowProps) {
  const themeColors = useFieldThemeColors();
  const { s, font } = useLayoutScale();

  return (
    <View className={cn(showDivider && 'mt-4 border-t border-outline-100 pt-4')}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked }}
        onPress={() => onCheckedChange(!checked)}
        className="flex-row items-center justify-between active:opacity-80">
        <View
          className="mr-3 items-center justify-center rounded-full"
          style={{
            width: s(44),
            height: s(44),
            backgroundColor: checked ? '#FFE8DC' : '#FFF4EE',
          }}>
          <Ionicons name={icon} size={s(22)} color="#FF5705" />
        </View>
        <View className="mr-3 min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-medium text-typography-900" style={{ fontSize: font.base }}>
              {title}
            </Text>
            {onInfoPress ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translateCurrent('common.moreInformation')}
                onPress={onInfoPress}
                hitSlop={8}
                className="active:opacity-70">
                <Ionicons
                  name="information-circle-outline"
                  size={s(18)}
                  color={themeColors.listItemSubText}
                />
              </Pressable>
            ) : null}
          </View>
          {description ? (
            <Text className="mt-1 text-typography-500" style={{ fontSize: font.sm }}>
              {description}
            </Text>
          ) : null}
        </View>

        <View className="items-end gap-2">
          <Text className="font-semibold text-typography-900" style={{ fontSize: font.base }}>
            {priceLabel}
          </Text>
          <View onStartShouldSetResponder={() => true}>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
