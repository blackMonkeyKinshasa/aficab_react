import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { SoftField } from '@/components/my-ui/SoftField';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function ModuleReservation({
  icon,
  title,
  placeholder,
  onPress,
  isDarkMode,
}: {
  icon: IoniconName;
  title: string;
  placeholder: string;
  onPress?: () => void;
  isDarkMode : boolean;
}) {
  return <SoftField icon={icon} value={title} placeholder={placeholder} onPress={onPress} isDarkMode={isDarkMode} />; 
}
