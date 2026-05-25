import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

export function ModuleReservation({ icon, title, isDarkMode }: any) {
  return (
    <View
      className={`flex-row items-center justify-between rounded-lg border px-2 py-2 ${
        isDarkMode ? 'border-gray-700 bg-neutral-800' : 'border-input bg-gray-100'
      }`}>
      <View className="mr-2 flex-1 flex-row items-center p-1">
        <Ionicons name={icon} size={24} color={isDarkMode ? 'white' : 'black'} />
        <Text
          className={`ml-3 flex-1 text-ellipsis text-base font-normal ${isDarkMode ? 'text-white' : 'text-black'}`}
          numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}
