import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

export function LoadingView() {
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.loading_container,
        { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' },
      ]}>
      <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading_container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
