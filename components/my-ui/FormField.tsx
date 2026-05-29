import { KeyboardTypeOptions, View } from 'react-native';

import { FormControl, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';

import { InfoIcon } from './InfoIcon';

const filledInputClassName = 'rounded-md border-0 bg-background-100';

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  showInfo = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable?: boolean;
  showInfo?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <FormControl className="mb-6">
      <FormControlLabel className="mb-2 flex-row items-center">
        <FormControlLabelText className="text-typography-500">{label}</FormControlLabelText>
        {showInfo ? (
          <View className="ml-2">
            <InfoIcon />
          </View>
        ) : null}
      </FormControlLabel>
      <Input
        variant="outline"
        size="control"
        className={filledInputClassName}
        isDisabled={!editable}>
        <InputField
          placeholder={placeholder}
          onChangeText={onChangeText}
          value={value}
          editable={editable}
          keyboardType={keyboardType}
        />
      </Input>
    </FormControl>
  );
}
