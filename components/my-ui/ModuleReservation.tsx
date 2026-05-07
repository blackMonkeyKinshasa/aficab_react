import { View, Text } from 'react-native';
import { Ionicons } from "@expo/vector-icons";



export function ModuleReservation({icon, title,isDarkMode}:any) {


  return (
    
    <View  className={`flex-row items-center justify-between px-2 py-2 rounded-lg border ${
      isDarkMode ? 'border-gray-700 bg-neutral-800' : 'border-input bg-gray-100'
        }`} >
              <View className='p-1 flex-1 flex-row items-center mr-2' >
                 
                  <Ionicons 
                    name={icon}
                    size={24}
                    color={isDarkMode ? 'white' : 'black'}
                  />
                    <Text className={`text-base flex-1 ml-3 font-normal text-ellipsis ${isDarkMode ? 'text-white' : 'text-black'}`} 
                    numberOfLines={1}>
                      {title}
                    </Text>

            </View>

    </View>

  );
}