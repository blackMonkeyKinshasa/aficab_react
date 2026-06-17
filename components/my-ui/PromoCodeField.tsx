import { ActivityIndicator, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const filledInputClassName = 'rounded-md border border-outline-100 bg-background-100';

type PromoCodeFieldProps = {
  label: string;
  placeholder: string;
  actionLabel: string;
  value: string;
  onChangeText: (value: string) => void;
  onApply: () => void;
  textColor: string;
  subTextColor: string;
  borderColor: string;
  inputBackgroundColor: string;
  titleSize?: number;
  disabled?: boolean;
  isApplying?: boolean;
  feedbackMessage?: string | null;
  feedbackTone?: 'success' | 'error' | 'default';
};

export function PromoCodeField({
  label,
  placeholder,
  actionLabel,
  value,
  onChangeText,
  onApply,
  textColor,
  subTextColor,
  borderColor,
  disabled = false,
  isApplying = false,
  feedbackMessage = null,
  feedbackTone = 'default',
}: PromoCodeFieldProps) {
  const feedbackClassName =
    feedbackTone === 'success'
      ? 'text-green-600'
      : feedbackTone === 'error'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <View className="mb-4 rounded-md border p-3" style={{ borderColor }}>
      <FormControl>
        <FormControlLabel className="mb-2">
          <FormControlLabelText
            className="font-semibold"
            style={{ color: textColor, fontSize: 16 }}>
            {label}
          </FormControlLabelText>
        </FormControlLabel>

        <View className="flex-row items-center gap-2">
          <Input
            variant="outline"
            size="control"
            className={cn('flex-1', filledInputClassName)}
            isDisabled={disabled || isApplying}>
            <InputField
              value={value}
              onChangeText={(text) => onChangeText(text.toUpperCase())}
              placeholder={placeholder}
              placeholderTextColor={subTextColor}
              editable={!disabled && !isApplying}
              style={{ color: textColor,  textTransform: 'uppercase' }}
            />
          </Input>

          <Button
            action="primary"
            variant="outline"
            size="control"
            className="min-w-32 rounded-md px-4"
            onPress={onApply}
            isDisabled={disabled || isApplying}>
            {isApplying ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <ButtonText style={{ color: textColor }}>{actionLabel}</ButtonText>
            )}
          </Button>
        </View>

        <View className="mt-2 min-h-4">
          {feedbackMessage ? (
            <Text className={cn('text-xs', feedbackClassName)}>{feedbackMessage}</Text>
          ) : null}
        </View>
      </FormControl>
    </View>
  );
}
