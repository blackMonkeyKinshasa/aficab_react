import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { keyboardAvoidingBehavior, useKeyboardVisibility } from '@/lib/use-keyboard-visibility';

interface BookingRecapLayoutProps {
  children: ReactNode;
  footer: ReactNode;
}

export function BookingRecapLayout({ children, footer }: BookingRecapLayoutProps) {
  const insets = useSafeAreaInsets();
  const footerBottomPadding = Math.max(insets.bottom, 12);
  const isKeyboardVisible = useKeyboardVisibility({ dismissOnMount: true });

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={keyboardAvoidingBehavior}
      enabled={isKeyboardVisible}>
      <View className="flex-1">
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={isKeyboardVisible}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        <View
          className="border-t border-outline-100 bg-background"
          style={{
            paddingTop: 12,
            paddingBottom: footerBottomPadding,
          }}>
          {footer}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
