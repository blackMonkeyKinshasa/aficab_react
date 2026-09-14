import React, { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { useUnreadNotificationCount } from '@/hooks/queries/useNotifications';
import { POLLING } from '@/lib/query/polling';
import { useMyStateNotif } from '@/store/notification-state';
import { useMyStateUser } from '@/store/user-state';
import { useLayoutScale } from '@/lib/layout-scale';

type Props = {
  isDark: boolean;
  onPress?: () => void;
};

export function NotificationIcon({ isDark, onPress: _onPress }: Props) {
  const userId = useMyStateUser((state) => state.user?.id);
  const setCountNotif = useMyStateNotif((state) => state.setCountNotif);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId, {
    pollingInterval: POLLING.notifications,
  });

  useEffect(() => {
    setCountNotif(unreadCount);
  }, [setCountNotif, unreadCount]);

  const router = useRouter();
  const { s, font } = useLayoutScale();
  const badge = s(18);
  const handlePress = () => {
    // #region agent log
    fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'notifications-crash-v1',hypothesisId:'H0',location:'NotificationIcon.tsx:handlePress',message:'Notification icon pressed',data:{hasUserId:Boolean(userId),unreadCountType:typeof unreadCount},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    router.push('/notificationsPage');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ padding: 8 }}>
      <View>
        <Bell size={s(20)} color={isDark ? '#fff' : '#000'} />

        {unreadCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              backgroundColor: '#FF3B30',
              borderRadius: 10,
              minWidth: badge,
              height: badge,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={{
                color: '#fff',
                fontSize: font.xs > 12 ? 12 : 10,
                fontWeight: 'bold',
              }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
