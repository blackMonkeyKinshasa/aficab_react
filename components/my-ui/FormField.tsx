import { KeyboardTypeOptions, Text, View } from 'react-native';

import { Input } from '@/components/ui/input';

import { InfoIcon } from './InfoIcon';

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  showInfo = false,
  keyboardType = 'default',
  isDark,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable?: boolean;
  showInfo?: boolean;
  keyboardType?: KeyboardTypeOptions;
  isDark: boolean;
}) {
  return (
    <View className="mb-6">
      <View className="mb-2 flex-row items-center">
        <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
        {showInfo && (
          <View className="ml-2">
            <InfoIcon />
          </View>
        )}
      </View>
      <Input
        placeholder={placeholder}
        onChangeText={onChangeText}
        value={value}
        editable={editable}
        keyboardType={keyboardType}
      />
    </View>
  );
}
