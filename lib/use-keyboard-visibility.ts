import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

function readKeyboardOpen() {
  return (Keyboard.metrics()?.height ?? 0) > 0;
}

type UseKeyboardVisibilityOptions = {
  dismissOnMount?: boolean;
};

export function dismissKeyboard() {
  Keyboard.dismiss();
}

export function useKeyboardVisibility(options?: UseKeyboardVisibilityOptions) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!options?.dismissOnMount) {
      return;
    }

    dismissKeyboard();
    setIsKeyboardVisible(false);
  }, [options?.dismissOnMount]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    const syncTimeout = setTimeout(() => {
      setIsKeyboardVisible(readKeyboardOpen());
    }, 50);

    return () => {
      clearTimeout(syncTimeout);
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return isKeyboardVisible;
}

export const keyboardAvoidingBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
