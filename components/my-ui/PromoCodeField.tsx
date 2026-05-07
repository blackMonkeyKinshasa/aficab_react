import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { Input } from '@/components/ui/input';

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
  inputBackgroundColor,
  titleSize = 16,
  disabled = false,
  isApplying = false,
  feedbackMessage = null,
  feedbackTone = 'default',
}: PromoCodeFieldProps) {
  const feedbackColor = feedbackTone === 'success'
    ? '#16a34a'
    : feedbackTone === 'error'
      ? '#dc2626'
      : subTextColor;

  return (
    <View style={{ borderWidth: 1, borderColor, borderRadius: 12, padding: 12, marginBottom: 15 }}>
      <Text style={{ color: textColor, fontSize: titleSize, fontWeight: '600', marginBottom: 10 }}>
        {label}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={subTextColor}
          editable={!disabled && !isApplying}
          style={{
            flex: 1,
            backgroundColor: inputBackgroundColor,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginRight: 8,
            borderWidth: 1,
            borderColor,
            color: textColor,
          }}
        />

        <TouchableOpacity
          style={{
            backgroundColor: inputBackgroundColor,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor,
            opacity: disabled || isApplying ? 0.6 : 1,
          }}
          onPress={onApply}
          disabled={disabled || isApplying}
          activeOpacity={0.8}
        >
          {isApplying ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <Text style={{ color: textColor, fontWeight: '500' }}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {feedbackMessage ? (
        <Text style={{ color: feedbackColor, fontSize: 12, marginTop: 10 }}>
          {feedbackMessage}
        </Text>
      ) : null}
    </View>
  );
}