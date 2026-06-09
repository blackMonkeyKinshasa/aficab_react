import { Tabs } from 'expo-router';
import { Home, Settings, User } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: isDark ? '#EEEEEE' : '#757575',
        tabBarStyle: {
          backgroundColor: isDark ? color.appDarkBackground : '#fff',
          borderTopColor: isDark ? '#333' : '#e5e5e5',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarLabel: t('tabs.home'),

          tabBarIcon: (props: { color: string }) => <Home size={24} color={props.color} />,
          headerShown: true,
        
        }}
      />
      <Tabs.Screen
        name="reservation"
        options={{
          title: t('tabs.bookings'),
          tabBarLabel: t('tabs.bookings'),
          tabBarIcon: (props: { color: string }) => <User size={24} color={props.color} />,
          ...buildStackScreenOptions({
            title: t('tabs.bookings'),
            isDark,
          }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: (props: { color: string }) => <Settings size={24} color={props.color} />,
          ...buildStackScreenOptions({
            title: t('tabs.settings'),
            isDark,
          }),
        }}
      />
    </Tabs>
  );
}
