import { View, Text, KeyboardTypeOptions } from 'react-native';
import { InfoIcon } from './InfoIcon';
import { Input } from '@/components/ui/input';

export function  FormField (
  { label, value, onChangeText, placeholder, editable = true, showInfo = false, keyboardType = 'default', isDark }
  : { label: string; value: string; onChangeText: (text: string) => void; placeholder: string; editable?: boolean; showInfo?: boolean; keyboardType?: KeyboardTypeOptions; isDark: boolean;
    })

    { 
        return(
 
  <View className="mb-6">
    <View className="flex-row items-center mb-2">
      <Text
        className={`text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        {label}
      </Text>
      {showInfo && <View className="ml-2"><InfoIcon /></View>}
    </View>
    <Input
      placeholder={placeholder}
      onChangeText={onChangeText}
      value={value}
      editable={editable}
      keyboardType={keyboardType}
     
    />
  </View>
);}