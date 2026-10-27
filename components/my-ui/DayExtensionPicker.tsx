import { Pressable, Text, View } from 'react-native';

import { DayExtensionType } from '@/constants/dataInterface';
import { color } from '@/constants/colors';
import { DayExtensionChoice } from '@/lib/day-extensions';
import { useFieldThemeColors } from '@/lib/field-theme';
import { useLayoutScale } from '@/lib/layout-scale';

type DayExtensionPickerProps = {
  dayLabel: string;
  value: DayExtensionChoice;
  flexPrice: number | null;
  premiumPrice: number | null;
  hasFlex: boolean;
  hasPremium: boolean;
  noneLabel: string;
  flexLabel: string;
  premiumLabel: string;
  onChange: (value: DayExtensionChoice) => void;
};

function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { font } = useLayoutScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      className="rounded-lg border px-2.5 py-2 active:opacity-80"
      style={{
        opacity: disabled ? 0.4 : 1,
        borderColor: selected ? color.primary : '#E5E7EB',
        backgroundColor: selected ? '#FFF4EE' : 'transparent',
      }}>
      <Text
        className="font-medium"
        style={{
          fontSize: font.sm,
          color: selected ? color.primary : '#6B7280',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DayExtensionPicker({
  dayLabel,
  value,
  flexPrice,
  premiumPrice,
  hasFlex,
  hasPremium,
  noneLabel,
  flexLabel,
  premiumLabel,
  onChange,
}: DayExtensionPickerProps) {
  const themeColors = useFieldThemeColors();
  const { font } = useLayoutScale();

  const setType = (next: DayExtensionType | null) => {
    onChange(value === next ? null : next);
  };

  return (
    <View className="mt-3 rounded-xl border border-outline-100 px-3 py-3">
      <Text className="font-semibold text-typography-900" style={{ fontSize: font.base }}>
        {dayLabel}
      </Text>
      <Text className="mt-1 text-typography-500" style={{ fontSize: font.sm }}>
        {value === 'flex' && flexPrice !== null
          ? `+${flexPrice} $`
          : value === 'premium' && premiumPrice !== null
            ? `+${premiumPrice} $`
            : noneLabel}
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Chip label={noneLabel} selected={value === null} onPress={() => onChange(null)} />
        {hasFlex ? (
          <Chip
            label={`${flexLabel}${flexPrice !== null ? ` · ${flexPrice}$` : ''}`}
            selected={value === 'flex'}
            onPress={() => setType('flex')}
          />
        ) : null}
        {hasPremium ? (
          <Chip
            label={`${premiumLabel}${premiumPrice !== null ? ` · ${premiumPrice}$` : ''}`}
            selected={value === 'premium'}
            onPress={() => setType('premium')}
          />
        ) : null}
      </View>

      {!hasFlex && !hasPremium ? (
        <Text className="mt-2" style={{ color: themeColors.listItemSubText, fontSize: font.sm }}>
          —
        </Text>
      ) : null}
    </View>
  );
}
