import { type LucideIcon } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useLayoutScale } from '@/lib/layout-scale';

export function MenuItem({
  icon: Icon,
  label,
  onPress,
  isDanger = false,
  isDark = false,
  iconColor,
  iconBackgroundColor,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void | Promise<void>;
  isDanger?: boolean;
  isDark?: boolean;
  iconColor?: string;
  iconBackgroundColor?: string;
}) {
  const resolvedIconColor = iconColor ?? (isDanger ? '#EF4444' : isDark ? '#ffffff' : '#12151C');
  const resolvedIconBackground = iconBackgroundColor ?? (isDanger ? '#FEF2F2' : '#F3F4F6');
  const { s, font } = useLayoutScale();
  const iconWell = s(36);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-1 flex-row items-center">
        <View
          className="items-center justify-center rounded-xl"
          style={{ backgroundColor: resolvedIconBackground, width: iconWell, height: iconWell }}>
          <Icon size={s(19)} color={resolvedIconColor} />
        </View>
        <Text
          className={`ml-3 font-semibold ${
            isDanger ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'
          }`}
          style={{ fontSize: font.base }}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
