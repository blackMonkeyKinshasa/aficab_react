import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Switch } from '@/components/ui/switch';
import { useFieldThemeColors } from '@/lib/field-theme';
import { cn } from '@/lib/utils';

interface BookingOptionToggleRowProps {
  title: string;
  description?: string;
  priceLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onInfoPress?: () => void;
  showDivider?: boolean;
}

export function BookingOptionToggleRow({
  title,
  description,
  priceLabel,
  checked,
  onCheckedChange,
  onInfoPress,
  showDivider = false,
}: BookingOptionToggleRowProps) {
  const themeColors = useFieldThemeColors();

  return (
    <View className={cn(showDivider && 'border-outline-100 mt-4 border-t pt-4')}>
      <View className="flex-row items-center justify-between">
        <View className="mr-3 min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-typography-900 text-base font-medium">{title}</Text>
            {onInfoPress ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More information"
                onPress={onInfoPress}
                hitSlop={8}
                className="active:opacity-70">
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={themeColors.listItemSubText}
                />
              </Pressable>
            ) : null}
          </View>
          {description ? (
            <Text className="text-typography-500 mt-1 text-sm">{description}</Text>
          ) : null}
        </View>

        <View className="items-end gap-2">
          <Text className="text-typography-900 text-base font-semibold">{priceLabel}</Text>
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </View>
      </View>
    </View>
  );
}
