import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { SoftField } from '@/components/my-ui/SoftField';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function ModuleReservation({
  icon,
  title,
  placeholder,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  placeholder: string;
  onPress?: () => void;
}) {
  return <SoftField icon={icon} value={title} placeholder={placeholder} onPress={onPress} />;
}
