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

const filledInputClassName = 'rounded-md border-0 bg-background-100';

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
  return (
    <FormControl className="mb-6">
      <FormControlLabel className="mb-2 flex-row items-center">
        <FormControlLabelText className="text-typography-500">{label}</FormControlLabelText>
        {showInfo ? (

          <Tooltip className="ml-2">
            <TooltipTrigger asChild> 
                <HelpCircle size={16} color="#999999" />
            </TooltipTrigger>
            <TooltipContent  className="ml-6 mr-6">
              <Text className="text-white text-sm font-normal ">{tootipMessage}</Text>
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
