import { View } from 'react-native';

import { Image } from 'expo-image';

import { blurhash } from '@/constants/constants';
import { supabase_blank_profile_picture } from '@/constants/env';
import { useLayoutScale } from '@/lib/layout-scale';

export function Avatar({
  uri,
  size,
  borderRadius,
  style,
  isDark,
}: {
  uri: string;
  size: number;
  borderRadius: number;
  style?: any;
  isDark: boolean;
}) {
  const { s } = useLayoutScale();
  const scaledSize = s(size);
  const scaledRadius = s(borderRadius);

  return (
    <View className="flex-row items-center">
      <Image
        source={uri ? { uri } : supabase_blank_profile_picture}
        style={{
          width: scaledSize,
          height: scaledSize,
          borderRadius: scaledRadius,
          borderColor: isDark ? '#333' : '#ccc',
          borderWidth: 1,
          ...style,
        }}
        contentFit="cover"
        transition={1000}
        placeholder={blurhash} // blurhash string
      />
    </View>
  );
}
