import { Dimensions, StyleSheet, TouchableOpacity, View, Text} from 'react-native';

import type { NativeStackNavigationOptions } from 'expo-router/native-stack';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { getLayoutScale, useLayoutScale } from '@/lib/layout-scale';

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
  const { t } = useI18n();
  const { s, font } = useLayoutScale();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      className="flex-row items-center">
      <ChevronLeft size={s(20)} color={isDark ? '#ffffff' : '#111827'} style={{ marginRight: 4 }} />
      <Text className="font-medium" style={{ color: isDark ? '#ffffff' : '#111827', fontSize: font.sm }}>
        {t('common.back')}
      </Text>
    </TouchableOpacity>
  );
}

export function buildStackScreenOptions({
  title,
  isDark = false,
  canGoBack = false,
  onBack,
  headerLeft,
  headerRight,
}: StackScreenHeaderOptions): NativeStackNavigationOptions {
  const backgroundColor = isDark ? color.appDarkBackground : '#ffffff';
  const { width, height } = Dimensions.get('window');
  const { font } = getLayoutScale(width, height);

  return {
    title,
    headerShown: true,
    headerTitleAlign: 'center',
    headerTitleStyle: {
      fontWeight: '700',
      fontSize: font.lg,
      color: isDark ? '#ffffff' : '#111827',
    },
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor,
    },
    headerBackVisible: false,
    headerLeft: () => {
      if (canGoBack) {
        return <CircularHeaderBackButton isDark={isDark} onPress={onBack} />;
      }

      if (headerLeft) {
        return headerLeft();
      }

      return null;
    },
    headerRight: () => {
      if (headerRight) {
        return headerRight();
      }

      return null;
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
