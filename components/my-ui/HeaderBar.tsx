import { Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export function HeaderBar() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  return (
    <View
      className={`flex-row items-center border-b px-4 py-4 ${
        isDark ? 'border-gray-900' : 'border-gray-200'
      }`}>
      <TouchableOpacity
        onPress={() => {
          router.back();
        }}>
        <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
      </TouchableOpacity>
      <Text
        className={`flex-1 text-center text-lg font-bold ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
        Modifier le profil
      </Text>
    </View>
  );
}
