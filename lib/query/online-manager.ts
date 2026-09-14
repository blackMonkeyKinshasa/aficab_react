import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

import { translateCurrent } from '@/lib/i18n';
import { isNetInfoOnline } from '@/lib/network';
import { showToast } from '@/lib/toast';

export function setupQueryOnlineManager() {
  let lastOnline: boolean | null = null;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = isNetInfoOnline(state);
    onlineManager.setOnline(isOnline);

    if (lastOnline === isOnline) {
      return;
    }

    if (lastOnline === null) {
      lastOnline = isOnline;
      return;
    }

    lastOnline = isOnline;

    if (!isOnline) {
      showToast({
        title: translateCurrent('common.error'),
        description: translateCurrent('network.offline'),
        action: 'warning',
      });
      return;
    }

    showToast({
      title: translateCurrent('network.onlineTitle'),
      description: translateCurrent('network.online'),
      action: 'success',
      duration: 2500,
    });
  });

  return () => {
    unsubscribe();
  };
}
