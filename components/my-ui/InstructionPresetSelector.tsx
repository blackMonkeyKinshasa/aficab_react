import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { color } from '@/constants/colors';
import { useLayoutScale } from '@/lib/layout-scale';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type InstructionPreset = {
  id: string;
  label: string;
  description: string;
  icon: IoniconName;
};

export function updateInstructionLines(current: string, message: string, shouldAdd: boolean) {
  const lines = current.split(/\r?\n/);

  if (shouldAdd) {
    if (lines.some((line) => line.trim() === message.trim())) return current;
    return current.trim() ? `${current.trimEnd()}\n${message}` : message;
  }

  return lines
    .filter((line) => line.trim() !== message.trim())
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

export function InstructionPresetSelector({
  options,
  selectedIds,
  onToggle,
}: {
  options: InstructionPreset[];
  selectedIds: string[];
  onToggle: (option: InstructionPreset) => void;
}) {
  const { s, font } = useLayoutScale();

  return (
    <View className="mb-4 overflow-hidden rounded-xl border border-outline-100">
      {options.map((option, index) => {
        const selected = selectedIds.includes(option.id);

        return (
          <Pressable
            key={option.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => onToggle(option)}
            className="flex-row items-center px-3 py-3 active:opacity-80"
            style={{
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: '#E5E7EB',
              backgroundColor: selected ? '#FFF7F2' : 'transparent',
            }}>
            <View
              className="items-center justify-center rounded-full"
              style={{ width: s(42), height: s(42), backgroundColor: '#FFF1EA' }}>
              <Ionicons name={option.icon} size={s(21)} color={color.primary} />
            </View>
            <View className="mx-3 min-w-0 flex-1">
              <Text className="font-semibold text-typography-900" style={{ fontSize: font.sm }}>
                {option.label}
              </Text>
              <Text className="mt-0.5 text-typography-500" style={{ fontSize: font.xs }}>
                {option.description}
              </Text>
            </View>
            <View
              className="items-center justify-center rounded-full border"
              style={{
                width: s(32),
                height: s(32),
                borderColor: color.primary,
                backgroundColor: selected ? color.primary : 'transparent',
              }}>
              <Ionicons name={selected ? 'checkmark' : 'add'} size={s(20)} color={selected ? '#FFFFFF' : color.primary} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
