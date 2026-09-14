import { KeyboardTypeOptions, Text, Pressable } from 'react-native';

import { FormControl, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { InfoIcon } from './InfoIcon';
import { HelpCircle } from 'lucide-react-native';
import { useLayoutScale } from '@/lib/layout-scale';

const filledInputClassName = 'rounded-md border';

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  showInfo = false,
  keyboardType = 'default',
  tootipMessage,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable?: boolean;
  showInfo?: boolean;
  keyboardType?: KeyboardTypeOptions;
  tootipMessage?: string;
}) {
  const { s, font } = useLayoutScale();

  return (
    <FormControl className="mb-6">
      <FormControlLabel className="mb-2 flex-row items-center">
        <FormControlLabelText className="font-medium text-gray-500" style={{ fontSize: font.sm }}>
          {label}
        </FormControlLabelText>
        {showInfo ? (

          <Tooltip className="ml-2">
            <TooltipTrigger asChild> 
                <HelpCircle size={s(16)} color="#999999" />
            </TooltipTrigger>
            <TooltipContent  className="ml-6 mr-6">
              <Text className="text-white font-normal" style={{ fontSize: font.sm }}>{tootipMessage}</Text>
            </TooltipContent>
          </Tooltip>
          
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
