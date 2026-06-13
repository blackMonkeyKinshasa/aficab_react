import { type LucideIcon, } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/ui/text';

export function MenuItem ({
    icon: Icon,
    label,
    onPress,
    isDanger = false,
    isDark = false
  }: {
    icon: LucideIcon;
    label: string;
    onPress: () => void | Promise<void>;
    isDanger?: boolean;
    isDark?: boolean;
  }) {
    return (
         <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between px-4 py-3`}>
      <View className="flex-1 flex-row items-center">
        <Icon size={20} color={isDanger ? '#ef4444' : isDark ? '#ffffff' : '#12151C'} />
        <Text
          className={`ml-4 text-sm font-semibold ${
            isDanger ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'
          }`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
    );
  };