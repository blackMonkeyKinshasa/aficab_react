import { Image, View } from 'react-native';
import { supabase_blank_profile_picture } from '@/constants/env';

export function Avatar({uri, size, borderRadius, style}: {uri: string, size: number, borderRadius: number, style?: any}) {

  return (
    <View className="flex-row items-center">
      <Image source={{ uri: uri ? uri : supabase_blank_profile_picture }} style={{ width: size, height: size, borderRadius: borderRadius }}  />
    </View>
  );
}