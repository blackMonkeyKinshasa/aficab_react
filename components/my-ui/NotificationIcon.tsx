import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {useRouter} from 'expo-router';

type Props = {
    isDark: boolean;
  count?: number;
  onPress?: () => void;
};

export function NotificationIcon({ isDark, count = 0, onPress }: Props) {
    const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/notificationsPage')} style={{ padding: 8 }}>
      <View>
        <Ionicons name="notifications-outline" size={20} color={isDark ? "#fff" : "#000"} />

        {count > 0 && (
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
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 10,
                fontWeight: "bold",
              }}
            >
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}