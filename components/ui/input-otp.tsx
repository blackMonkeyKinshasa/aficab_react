import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp-native';

import { Text } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { cn } from '@/lib/utils';

const DEFAULT_MAX_LENGTH = 6;
const SLOT_GAP = 8;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
  },
  otpContainer: {
    alignSelf: 'center',
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SLOT_GAP,
  },
});

interface InputOTPProps {
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

function InputOTPSlot({
  char,
  isActive,
  hasFakeCaret,
  placeholderChar,
}: Pick<SlotProps, 'char' | 'isActive' | 'hasFakeCaret' | 'placeholderChar'>) {
  const displayChar = char ?? placeholderChar ?? '-';

  return (
    <View
      className={cn(
        'h-14 w-11 items-center justify-center rounded-xl border bg-gray-100 dark:bg-neutral-800',
        isActive ? 'border-2 border-primary' : 'border-transparent',
        char === null && 'opacity-70'
      )}>
      <Text
        className={cn(
          'text-xl font-semibold',
          char === null ? 'text-muted-foreground' : 'text-foreground'
        )}>
        {displayChar}
      </Text>
      {hasFakeCaret ? (
        <View
          className="absolute h-7 w-0.5 rounded-full"
          style={{ backgroundColor: color.primary }}
        />
      ) : null}
    </View>
  );
}

function InputOTP({
  value,
  onChange,
  onComplete,
  maxLength = DEFAULT_MAX_LENGTH,
  disabled = false,
  className,
}: InputOTPProps) {
  return (
    <View style={styles.wrapper} className={className}>
      <OTPInput
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        maxLength={maxLength}
        pattern={REGEXP_ONLY_DIGITS}
        placeholder="-"
        editable={!disabled}
        textAlign="center"
        containerStyle={styles.otpContainer}
        render={({ slots }) => (
          <View style={styles.slotsRow}>
            {slots.map((slot, index) => (
              <Pressable key={index} onPress={slot.focus} disabled={disabled}>
                <InputOTPSlot
                  char={slot.char}
                  isActive={slot.isActive}
                  hasFakeCaret={slot.hasFakeCaret}
                  placeholderChar={slot.placeholderChar}
                />
              </Pressable>
            ))}
          </View>
        )}
      />
    </View>
  );
}

export { InputOTP, InputOTPSlot };
export type { InputOTPProps };
