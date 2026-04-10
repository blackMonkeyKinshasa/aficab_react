import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {useRouter} from 'expo-router';
import { supabase } from "@/lib/supabase";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";
import { getActivity } from "@/api/activity";
import { Activity } from "@/constants/dataInterface";

type Props = {
  isDark: boolean;
  onPress?: () => void;
};

export function NotificationIcon({ isDark, onPress }: Props) {

  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        getActivity({userId:user.id, isRead:false}).then((data) => {
            setActivities(data);
            console.log('Notification count:', data.length);
          })
          .catch((err) => console.error(err));
      }
    }).catch((err) => console.error(err));
  
  }, []);
    const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/notificationsPage')} style={{ padding: 8 }}>
      <View>
        <Ionicons name="notifications-outline" size={20} color={isDark ? "#fff" : "#000"} />

        {activities.length > 0 && (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -6,
              backgroundColor: "#FF3B30",
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 10,
                fontWeight: "bold",
              }}
            >{activities.length > 99 ? "99+" : activities.length}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}