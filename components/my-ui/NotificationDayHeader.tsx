import { StyleSheet, Text, View } from 'react-native';

import { useLayoutScale } from '@/lib/layout-scale';

export function NotificationDayHeader({
  title,
  isDark,
}: {
  title: string;
  isDark: boolean;
}) {
  const { font } = useLayoutScale();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: isDark ? '#B4BED0' : '#596579', fontSize: font.xs }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  title: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
