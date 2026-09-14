import { AppState, AppStateStatus, Platform } from 'react-native';

import { focusManager } from '@tanstack/react-query';

export function setupQueryFocusManager() {
  const handleAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS === 'web') {
      return;
    }

    focusManager.setFocused(status === 'active');
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    subscription.remove();
  };
}
