import React from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@/components/ui/actionsheet';
import { Button, ButtonText } from '@/components/ui/button';
import { bookingSpacing, controlHeightStyle } from '@/constants/spacing';
import {
  dismissKeyboard,
  keyboardAvoidingBehavior,
  useKeyboardVisibility,
} from '@/lib/use-keyboard-visibility';

/** Same surface token as ActionsheetContent (`bg-background-0` in actionsheet). */
export const bookingSheetContentClassName = 'bg-background-0';

/** Card on sheet surface — border matches sheet (`border-outline-100`). */
export const bookingSheetCardClassName = 'rounded-2xl border border-outline-100 bg-background-0';

export type SheetFooterAction = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
};

interface BookingSheetLayoutProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
  footerActions?: SheetFooterAction[];
  /** When true, sheet height follows content instead of expanding to 90% of the screen. */
  fitContent?: boolean;
  snapPoints?: number[];
}

export function BookingSheetLayout({
  visible,
  onDismiss,
  title,
  children,
  footerActions = [],
  fitContent = false,
  snapPoints = [85],
}: BookingSheetLayoutProps) {
  const insets = useSafeAreaInsets();
  const footerBottomPadding = Math.max(insets.bottom, 12);
  const isKeyboardVisible = useKeyboardVisibility();
  const hasFooter = footerActions.length > 0;

  const handleDismiss = () => {
    dismissKeyboard();
    onDismiss();
  };

  const footer = hasFooter ? (
    <View
      className="border-outline-200 w-full flex-row gap-3 pt-3"
      style={{
        paddingHorizontal: bookingSpacing.screenPaddingX,
        paddingBottom: footerBottomPadding,
      }}>
      {footerActions.map((action) => (
        <Button
          key={action.label}
          action="primary"
          variant={action.variant ?? 'solid'}
          size="control"
          className="flex-1 rounded-full"
          style={controlHeightStyle}
          onPress={action.onPress}
          isDisabled={action.disabled}>
          <ButtonText>{action.label}</ButtonText>
        </Button>
      ))}
    </View>
  ) : null;

  return (
    <Actionsheet
      isOpen={!!visible}
      onClose={handleDismiss}
      {...(fitContent ? {} : { snapPoints: snapPoints })}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper className="py-3">
          <ActionsheetDragIndicator className="h-1.5 w-20" />
        </ActionsheetDragIndicatorWrapper>

        {title ? (
          <View
            className="w-full pb-3"
            style={{ paddingHorizontal: bookingSpacing.screenPaddingX }}>
            <Text className="text-typography-900 text-center text-lg font-bold">{title}</Text>
          </View>
        ) : null}

        <KeyboardAvoidingView
          className="w-full flex-1"
          behavior={keyboardAvoidingBehavior}
          enabled={hasFooter && isKeyboardVisible}>
          <View className="w-full flex-1">
            <ScrollView>{children}</ScrollView>
            {footer}
          </View>
        </KeyboardAvoidingView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
