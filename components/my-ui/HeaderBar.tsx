import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';      

export function HeaderBar() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();     

    return (
       
              <View
                className={`flex-row items-center px-4 py-4 border-b ${
                  isDark ? 'border-gray-900' : 'border-gray-200'
                }`}
              >
                <TouchableOpacity onPress={() =>{
                   router.back()
                }} >
                  <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
                </TouchableOpacity>
                <Text
                  className={`text-lg font-bold flex-1 text-center ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Modifier le profil
                </Text>
              </View>
    );  
}