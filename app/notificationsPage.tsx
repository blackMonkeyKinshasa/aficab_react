import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { getActivity } from '@/api/activity';
import { useEffect, useState } from 'react';
import { Activity, ActivityAction } from '@/constants/dataInterface';
import { supabase } from '@/lib/supabase';
import { LoadingView } from '@/components/my-ui/LoadingView';

const ACTION_LABELS: Record<ActivityAction, { title: string; body: (a: Activity) => string }> = {
  'car-approved':           { title: 'Véhicule approuvé',          body: (a) => `Le véhicule "${a.target}" a été approuvé.` },
  'car-pending-approval':   { title: 'Véhicule en attente',        body: (a) => `"${a.target}" est en attente d'approbation.` },
  'driver-approved':        { title: 'Chauffeur approuvé',         body: (a) => `Le chauffeur "${a.target}" a été approuvé.` },
  'driver-pending-approval':{ title: 'Chauffeur en attente',       body: (a) => `"${a.target}" est en attente d'approbation.` },
  'booking-new':            { title: 'Nouvelle réservation',       body: (a) => `Nouvelle réservation : ${a.target ?? a.bookingId ?? ''}.` },
  'booking-driver-notify':  { title: 'Mission assignée',           body: (a) => `Une course vous a été assignée (${a.bookingId ?? ''}).` },
  'booking-driver-cancel':  { title: 'Réservation annulée',        body: (a) => `La course de "${a.target}" a été annulée.` },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function NotificationItem({ item, isDark }: { item: Activity; isDark: boolean }) {
  const meta = ACTION_LABELS[item.action] ?? { title: item.action, body: () => item.target ?? '' };
  return (
    <View style={[
      styles.item,
      { backgroundColor: isDark ? '#1c1c1e' : '#fff' },
      !item.isRead && { borderLeftColor: '#FE5900', borderLeftWidth: 3 },
    ]}>
      <View style={styles.itemHeader}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
          {meta.title}
        </Text>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <Text style={[styles.body, { color: isDark ? '#aaa' : '#555' }]} numberOfLines={2}>
        {meta.body(item)}
      </Text>
      <Text style={[styles.date, { color: isDark ? '#666' : '#999' }]}>
        {formatDate(item.createAt)}
      </Text>
    </View>
  );
}

export default function Notifications() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        console.log('user', user.id);
        getActivity({userId :user.id})
          .then((data) => setActivities(data))
          .catch(() => setError('Impossible de charger les notifications.'))
          .finally(() => setLoading(false));
      }
    }).catch(() => {
      setError('Impossible de charger les notifications.');
      setLoading(false);
    });
   
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications', headerShown: true, headerBackTitle: 'Retour' }} />
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f2f2f7' }]}>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#555' }]}>{error}</Text>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NotificationItem item={item} isDark={isDark} />}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#555' }]}>
                Aucune notification.
              </Text>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 , alignItems: 'center', justifyContent: 'center' },
  list:       { padding: 16, paddingBottom: 32 },
  item: {
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title:      { fontSize: 15, fontWeight: '600', flex: 1 },
  body:       { fontSize: 13, marginBottom: 6, lineHeight: 18 },
  date:       { fontSize: 11 },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FE5900', marginLeft: 8 },
  separator:  { height: 10 },
  emptyText:  { textAlign: 'center', marginTop: 60, fontSize: 14 },
});