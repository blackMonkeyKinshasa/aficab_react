import { Tabs } from 'expo-router';
import { Home, User, Settings } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FE5900',
        tabBarInactiveTintColor: isDark ? '#EEEEEE' : '#757575',
        tabBarStyle: {
          backgroundColor: isDark ? '#1a1a1a' : '#fff',
          borderTopColor: isDark ? '#333' : '#e5e5e5',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
          
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          headerShown: true,
          headerTitle: 'Accueil',

        }}
      />
      <Tabs.Screen
        name="reservation"
        options={{
          title: 'Réservation',
          tabBarLabel: 'Mes réservations',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
          headerShown: true,
          headerTitle: 'Mes réservations',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarLabel: 'Paramètres',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          headerShown: true,
          headerTitle: 'Paramètres',
          
        }}
      />
    </Tabs>
  );
}