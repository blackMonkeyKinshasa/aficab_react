import { ChevronDown } from 'lucide-react-native';
import { colorScheme, useColorScheme } from 'nativewind';
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native'; 
import { GenderOptions } from '@/constants/dataInterface';
import { InfoIcon } from '@/components/my-ui/InfoIcon';
import { useI18n } from '@/lib/i18n';
 
 
 export function DropdownField ({ label, value, onSelect, options, showInfo , isDark,showGenderDropdown, setShowGenderDropdown }
    :{ label: string; value: string; onSelect: (value: string) => void; options: GenderOptions[]; showInfo: boolean; isDark?: boolean; showGenderDropdown: boolean; setShowGenderDropdown: (value: boolean) => void }
        ){
    const { t } = useI18n();


              
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
      <TouchableOpacity
        onPress={() => setShowGenderDropdown(!showGenderDropdown)}
        className={`flex-row items-center justify-between px-4 py-3 rounded-lg ${
          isDark ? 'bg-neutral-800' : 'bg-gray-100'
        }`}
      >
        <Text
          className={`text-base ${
            value
              ? isDark
                ? 'text-white'
                : 'text-gray-900'
              : isDark
              ? 'text-gray-400'
              : 'text-gray-600'
          }`}
        >
          {value
            ? options.find((opt) => opt.value === value)?.label
            : t('common.select')}
        </Text>
        <ChevronDown size={24} color={isDark ? '#666666' : '#999999'} />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {showGenderDropdown && (
        <View
          className={`mt-2 rounded-lg overflow-hidden border z-50 ${
            isDark
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                setShowGenderDropdown(false);
              }}
              className={`px-4 py-3 border-b ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <Text
                className={`text-base ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
 );
}
   
  
   
 
