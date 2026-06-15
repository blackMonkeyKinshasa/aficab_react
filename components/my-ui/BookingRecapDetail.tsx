import { Text, View } from 'react-native';

interface BookingRecapDetailRowProps {
  label: string;
  value: string;
  hasDots?: boolean;
}

export function BookingRecapDetailColumn({ label, value, hasDots = false }: BookingRecapDetailRowProps) {
  return (
    <View className="mb-3 items-start justify-between gap-1">
      <Text className="text-typography-500 max-w-[50%] shrink-0 text-sm">{label} {hasDots && ':'}</Text>
      <Text className="text-typography-900 flex-1 text-sm font-medium">{value}</Text>
    </View>
  );
}


export function BookingRecapDetailRow({ label, value, hasDots = false }: BookingRecapDetailRowProps) {
  return (
    <View className="mb-3 items-start flex-row justify-between ">
      <Text className="text-typography-500 max-w-[50%] shrink-0 text-sm">{label} {hasDots && ':'}</Text>
      <Text className="text-typography-900  align-end text-sm font-medium">{value}</Text>
    </View>
  );
}
