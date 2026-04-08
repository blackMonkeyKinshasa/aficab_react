import { View, Text, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon'; 



export default function Notifications() {  


    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS('Notifications', 0, isDark, () => router.push('/Settings'))} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            Notifications
          </Text>
        </View>
      </>
    );
 }