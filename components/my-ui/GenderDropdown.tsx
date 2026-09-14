import { useState } from 'react';
import { StyleSheet } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';
import { Dropdown } from 'react-native-element-dropdown';

import { useI18n } from '@/lib/i18n';

type GenderOption = {
  label: string;
  value: string;
};

type GenderDropdownProps = {
  data: GenderOption[];
  value: string;
  placeholder: string;
  isDark: boolean;
  onChange: (value: string) => void;
};

export function GenderDropdown({
  data,
  value,
  placeholder,
  isDark,
  onChange,
}: GenderDropdownProps) {
  const { language } = useI18n();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Dropdown
      style={[
        styles.dropdown,
        {
          borderColor: isFocused ? '#FF5705' : isDark ? '#4B5563' : '#D1D5DB',
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        },
      ]}
      placeholderStyle={[
        styles.placeholderStyle,
        { color: isDark ? '#9CA3AF' : '#6B7280' },
      ]}
      selectedTextStyle={[
        styles.selectedTextStyle,
        { color: isDark ? '#FFFFFF' : '#111827' },
      ]}
      inputSearchStyle={[
        styles.inputSearchStyle,
        {
          color: isDark ? '#FFFFFF' : '#111827',
          borderColor: isDark ? '#4B5563' : '#D1D5DB',
        },
      ]}
      itemTextStyle={{ color: isDark ? '#FFFFFF' : '#111827' }}
      containerStyle={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderColor: isDark ? '#4B5563' : '#D1D5DB',
        borderRadius: 8,
      }}
      iconStyle={styles.iconStyle}
      data={data}
      
      maxHeight={300}
      labelField="label"
      valueField="value"
      placeholder={placeholder}
      searchPlaceholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
      value={value || null}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(item) => {
        onChange(item.value);
        setIsFocused(false);
      }}
     
    />
  );
}

const styles = StyleSheet.create({
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 8,
  },
});
