import { View, Text } from 'react-native';
import { Image } from 'expo-image';

 type Props =  {isDark: boolean}

export function ErrorEmptyReservation({isDark} :Props) {
  return (
    <View className="flex flex-col items-center justify-center">
      <Image source={require('@/assets/images/sports_car-bro.svg')}        style={{ width: 300, height: 300, resizeMode: 'contain', marginBottom: 20 }}
        />
      <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#aaa' : '#555' }}>Aucune réservation</Text>
    </View>
  );
}