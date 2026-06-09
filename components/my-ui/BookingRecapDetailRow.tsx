import { Text, View } from 'react-native';

interface BookingRecapDetailRowProps {
  label: string;
  value: string;
}

export function BookingRecapDetailRow({ label, value }: BookingRecapDetailRowProps) {
  return (
    <View className="mb-3 flex-row items-start justify-between gap-4">
      <Text className="text-typography-500 max-w-[50%] shrink-0 text-sm">{label}</Text>
      <Text className="text-typography-900 flex-1 text-right text-sm font-medium">{value}</Text>
    </View>
  );
}
