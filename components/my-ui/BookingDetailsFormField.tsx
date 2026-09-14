import type { ComponentProps } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { color } from '@/constants/colors';
import { controlHeightStyle } from '@/constants/spacing';
import { useLayoutScale } from '@/lib/layout-scale';
import { cn } from '@/lib/utils';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function BookingDetailsFormField({
  label,
  icon,
  value = '',
  placeholder,
  onPress,
  isDarkMode,
  editable = false,
  onChangeText,
  showChevron = false,
}: {
  label: string;
  icon: IoniconName;
  value?: string;
  placeholder: string;
  onPress?: () => void;
  isDarkMode: boolean;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  showChevron?: boolean;
}) {
  const hasValue = value.trim().length > 0;
  const iconColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';
  const backgroundColor = isDarkMode ? '#1E2226' : '#FFFFFF';
  const { s, font } = useLayoutScale();

  const content = (
    <>
      <Ionicons name={icon} size={s(20)} color={iconColor} style={{ marginRight: 10 }} />
      {editable ? (
        <TextInput
          className="flex-1 text-typography-900"
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
          value={value}
          onChangeText={onChangeText}
          style={{ paddingVertical: 0, fontSize: font.base }}
        />
      ) : (
        <Text
          className={cn('flex-1', hasValue ? 'text-typography-900' : 'text-typography-placeholder')}
          style={{ fontSize: font.base }}
          numberOfLines={1}>
          {hasValue ? value : placeholder}
        </Text>
      )}
      {showChevron ? <Ionicons name="chevron-forward" size={s(18)} color={iconColor} /> : null}
    </>
  );

  const containerClass = 'flex-row items-center rounded-xl border px-4';
  const containerStyle = [controlHeightStyle, { borderColor, backgroundColor }];

  return (
    <View className="gap-2">
      <Text className="font-semibold text-typography-900" style={{ fontSize: font.base }}>
        {label}
      </Text>
      {onPress && !editable ? (
        <Pressable onPress={onPress} className={containerClass} style={containerStyle}>
          {content}
        </Pressable>
      ) : (
        <View className={containerClass} style={containerStyle}>
          {content}
        </View>
      )}
    </View>
  );
}

export function BookingSegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  isDarkMode,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  isDarkMode: boolean;
}) {
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';
  const unselectedBg = isDarkMode ? '#1E2226' : '#FFFFFF';
  const { font } = useLayoutScale();

  return (
    <View className="gap-2">
      <Text className="font-semibold text-typography-900" style={{ fontSize: font.base }}>
        {label}
      </Text>
      <View className="flex-row overflow-hidden rounded-xl border" style={{ borderColor }}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className="flex-1 items-center justify-center px-3 py-3"
              style={{
                backgroundColor: selected ? color.primary : unselectedBg,
                borderLeftWidth: index === 0 ? 0 : 1,
                borderLeftColor: borderColor,
              }}>
              <Text
                className="font-semibold"
                style={{
                  fontSize: font.sm,
                  color: selected ? color.white : isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function BookingDateTimeRow({
  dateLabel,
  timeLabel,
  dateValue,
  timeValue,
  datePlaceholder,
  timePlaceholder,
  onPressDate,
  onPressTime,
  isDarkMode,
}: {
  dateLabel: string;
  timeLabel: string;
  dateValue: string;
  timeValue: string;
  datePlaceholder: string;
  timePlaceholder: string;
  onPressDate: () => void;
  onPressTime: () => void;
  isDarkMode: boolean;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <BookingDetailsFormField
          label={dateLabel}
          icon="calendar-outline"
          value={dateValue}
          placeholder={datePlaceholder}
          onPress={onPressDate}
          isDarkMode={isDarkMode}
        />
      </View>
      <View className="flex-1">
        <BookingDetailsFormField
          label={timeLabel}
          icon="time-outline"
          value={timeValue}
          placeholder={timePlaceholder}
          onPress={onPressTime}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
}
