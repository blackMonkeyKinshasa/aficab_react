import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { getActivity } from '@/api/activity';
import { Activity } from '@/constants/dataInterface';
import { supabase } from '@/lib/supabase';
import { useMyStateNotif } from '@/store/notification-state';

type Props = {
  isDark: boolean;
  onPress?: () => void;
};

export function NotificationIcon({ isDark, onPress }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const { countNotif, setCountNotif, clearCountNotif } = useMyStateNotif();

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          getActivity({ userId: user.id, isRead: '0' })
            .then((data) => {
              setActivities(data);
              console.log('Notification count: 0', data.length);
              setCountNotif(data.length);
            })
            .catch((err) => console.error(err));
        }
      })
      .catch((err) => console.error(err));
  }, [countNotif]);
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/notificationsPage')} style={{ padding: 8 }}>
      <View>
        <Bell size={20} color={isDark ? '#fff' : '#000'} />

        {countNotif > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              backgroundColor: '#FF3B30',
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={{
                color: '#fff',
                fontSize: 10,
                fontWeight: 'bold',
              }}>
              {countNotif > 99 ? '99+' : countNotif}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
