import {  View } from 'react-native';
import { supabase_blank_profile_picture } from '@/constants/env';
import { Image } from 'expo-image';
import { blurhash } from '@/constants/constants';

export function Avatar({uri, size, borderRadius, style, isDark}: 
  {uri: string, size: number, borderRadius: number, style?: any, isDark: boolean}) {

  return (
    <View className="flex-row items-center">
      <Image source={uri ? { uri } : supabase_blank_profile_picture}
            style={{ width: size, height: size, borderRadius: borderRadius, borderColor: isDark ? '#333' : '#ccc', borderWidth: 1, ...style }}
            contentFit="cover"
            transition={1000}
            placeholder={blurhash} // blurhash string
  
            />
    </View>
  );
}