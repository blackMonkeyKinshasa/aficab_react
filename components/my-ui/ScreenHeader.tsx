import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { color } from '@/constants/colors';

export const HEADER_SIDE_WIDTH = 48;

export interface StackScreenHeaderOptions {
  title: string;
  isDark: boolean;
  canGoBack?: boolean;
  onBack?: () => void;
  headerLeft?: () => ReactNode;
  headerRight?: () => ReactNode;
}

export function HeaderSideSpacer() {
  return <View style={styles.sideSpacer} />;
}

export function CircularHeaderBackButton({
  isDark,
  onPress,
}: {
  isDark: boolean;
  onPress?: () => void;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={[styles.backButton, { borderColor: isDark ? '#3f3f46' : '#e5e7eb' }]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Back">
      <ArrowLeft size={20} color={isDark ? '#ffffff' : '#111827'} />
    </TouchableOpacity>
  );
}

export function buildStackScreenOptions({
  title,
  isDark,
  canGoBack = false,
  onBack,
  headerLeft,
  headerRight,
}: StackScreenHeaderOptions): NativeStackNavigationOptions {
  const backgroundColor = isDark ? color.appDarkBackground : '#ffffff';

  return {
    title,
    headerShown: true,
    headerTitleAlign: 'center',
    headerTitleStyle: {
      fontWeight: '700',
      fontSize: 18,
      color: isDark ? '#ffffff' : '#111827',
    },
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor,
    },
    headerBackVisible: false,
    headerLeft: () => {
      if (headerLeft) {
        return headerLeft();
      }

      if (canGoBack) {
        return <CircularHeaderBackButton isDark={isDark} onPress={onBack} />;
      }

      return <HeaderSideSpacer />;
    },
    headerRight: () => {
      if (headerRight) {
        return headerRight();
      }

      return <HeaderSideSpacer />;
    },
  };
}

const styles = StyleSheet.create({
  sideSpacer: {
    width: HEADER_SIDE_WIDTH,
    height: HEADER_SIDE_WIDTH,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
