import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { color } from '@/constants/colors';
import { controlHeightStyle, SOFT_FIELD_HEIGHT } from '@/constants/spacing';
import { useFieldThemeColors } from '@/lib/field-theme';
import { cn } from '@/lib/utils';

export const softFieldClassName = 'flex-row items-center rounded-xl border-0 bg-muted px-4';

const softFieldStyle = StyleSheet.create({
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: SOFT_FIELD_HEIGHT,
    paddingVertical: 0,
    fontSize: 16,
  },
});

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface SoftFieldProps {
  icon: IoniconName;
  value?: string;
  placeholder: string;
  onPress?: () => void;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  className?: string;
  autoFocus?: boolean;
  isDarkMode: boolean;
}

export function SoftField({
  icon,
  value = '',
  placeholder,
  onPress,
  editable = false,
  onChangeText,
  className,
  autoFocus,
  isDarkMode,
}: SoftFieldProps) {
  const themeColors = useFieldThemeColors();
  const hasValue = value.trim().length > 0;
  const displayText = hasValue ? value : placeholder;

  const content = (
    <>
      <Ionicons name={icon} size={20} color={isDarkMode ? 'white' : 'black'} style={softFieldStyle.icon} />
      {editable ? (
        <TextInput
          style={softFieldStyle.input}
          className="text-typography-900"
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholder}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
        />
      ) : (
        <Text
          className={cn(
            'flex-1 text-base',
            hasValue ? 'text-typography-900' : 'text-typography-placeholder'
          )}
          numberOfLines={1}>
          {displayText}
        </Text>
      )}
    </>
  );

  const containerClass = cn(softFieldClassName, className);
  const containerProps = {
    className: containerClass,
    style: controlHeightStyle,
  };

  if (onPress && !editable) {
    return (
      <Pressable onPress={onPress} {...containerProps}>
        {content}
      </Pressable>
    );
  }

  return <View {...containerProps}>{content}</View>;
}
