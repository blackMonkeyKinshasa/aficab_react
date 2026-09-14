import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { color } from '@/constants/colors';
import { useLayoutScale } from '@/lib/layout-scale';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function BookingRecapServiceBanner({
  icon,
  label,
  status,
  statusColor = color.primary,
}: {
  icon: IoniconName;
  label: string;
  status: string;
  statusColor?: string;
}) {
  const { s, font } = useLayoutScale();

  return (
    <View className="mb-4 flex-row items-center rounded-2xl border border-outline-100 bg-white p-3 dark:bg-[#1E1E1E]">
      <View
        className="items-center justify-center rounded-full"
        style={{ width: s(40), height: s(40), backgroundColor: '#FFF1EA' }}>
        <Ionicons name={icon} size={s(21)} color={color.primary} />
      </View>
      <Text className="ml-3 flex-1 font-semibold text-typography-900" style={{ fontSize: font.sm }}>
        {label}
      </Text>
      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: statusColor }}>
        <Text className="font-semibold text-white" style={{ fontSize: font.xs }}>
          {status}
        </Text>
      </View>
    </View>
  );
}

export function BookingRecapStatusRow({
  label,
  value,
  tone = 'primary',
  showChevron = false,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'success';
  showChevron?: boolean;
}) {
  const { s, font } = useLayoutScale();
  const valueColor = tone === 'success' ? '#16A34A' : color.primary;

  return (
    <View className="mb-3 flex-row items-center gap-4 rounded-xl border border-outline-100 bg-white px-4 py-3 dark:bg-[#1E1E1E]">
      <Text className=" font-semibold text-typography-900" style={{ fontSize: font.sm }}>
        {label}
      </Text>
      <Text className="font-medium flex-1 " style={{ color: valueColor, fontSize: font.sm }}>
        {value}
      </Text>
     
    </View>
  );
}

export function BookingRecapDriverNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { s, font } = useLayoutScale();

  return (
    <View className="mb-4 flex-row items-center rounded-2xl border border-[#FFE0D2] bg-[#FFF1EA] p-4 dark:border-[#5B3428] dark:bg-[#3D241C]">
      <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-primary">
        <Ionicons name="time-outline" size={s(22)} color={color.primary} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-typography-900" style={{ fontSize: font.sm }}>
          {title}
        </Text>
        <Text className="mt-1 text-typography-600" style={{ fontSize: font.xs }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
