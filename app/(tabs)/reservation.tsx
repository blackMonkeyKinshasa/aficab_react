import {
  View,
  Text,
  Alert,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { getAllBookings } from '@/api/booking';
import { useEffect, useState } from 'react';
import { Booking } from '@/constants/dataInterface';
import { ResStatus, ResType } from '@/constants/databaseEnum';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { supabase } from '@/lib/supabase';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ResStatus, string> = {
  [ResStatus.PENDING]:       '#FFA500',
  [ResStatus.PENDINGDRIVER]: '#FFC107',
  [ResStatus.CONFIRMED]:     '#2196F3',
  [ResStatus.STARTED]:       '#9C27B0',
  [ResStatus.ENDED]:         '#4CAF50',
  [ResStatus.CANCELED]:      '#F44336',
  [ResStatus.ARCHIVED]:      '#9E9E9E',
};

const STATUS_LABELS: Record<ResStatus, string> = {
  [ResStatus.PENDING]:       'En attente',
  [ResStatus.PENDINGDRIVER]: 'Chauffeur à confirmer',
  [ResStatus.CONFIRMED]:     'Confirmé',
  [ResStatus.STARTED]:       'En cours',
  [ResStatus.ENDED]:         'Terminé',
  [ResStatus.CANCELED]:      'Annulé',
  [ResStatus.ARCHIVED]:      'Archivé',
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const CAR_PLACEHOLDER = 'https://via.placeholder.com/120x80?text=Car';

function getCarImage(booking: Booking): string {
  const imgs = booking.car?.images;
  if (imgs && imgs.length > 0) return imgs[0] as string;
  return CAR_PLACEHOLDER;
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function BookingDetailModal({
  booking,
  isDark,
  onClose,
}: {
  booking: Booking;
  isDark: boolean;
  onClose: () => void;
}) {
  const bg  = isDark ? '#1c1c1e' : '#fff';
  const fg  = isDark ? '#fff'    : '#000';
  const sub = isDark ? '#aaa'    : '#555';
  const sep = isDark ? '#333'    : '#eee';

  const statusColor = STATUS_COLORS[booking.status] ?? '#999';

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.detailRow, { borderBottomColor: sep }]}>
      <Text style={[styles.detailLabel, { color: sub }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: fg }]}>{value}</Text>
    </View>
  );

  const driverUser = booking.driver?.user as Record<string, string> | undefined;
  const driverAvatar = driverUser?.avatar_url ?? null;
  const driverName   = driverUser?.full_name  ?? '—';
  const driverPhone  = driverUser?.phone ?? null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} 
    transparent={false}
      presentationStyle="formSheet"
      statusBarTranslucent={false}>
      <View style={[styles.modalContainer, { backgroundColor: isDark ? '#000' : '#f2f2f7' }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { backgroundColor: isDark ? '#000' : '#f2f2f7' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: fg, fontSize: 24 }}>← </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: fg, flex: 1, textAlign: 'center' }]}>Détail de la course</Text>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Car image */}
          <Image
            source={{ uri: getCarImage(booking) }}
            style={styles.detailCarImage}
            resizeMode="cover"
          />

          {/* Status badge */}
          <View style={[styles.statusBadgeLarge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </Text>
          </View>

          {/* Main info */}
          <View style={[styles.card, { backgroundColor: bg, padding: 10 , marginTop :10}]}>
            <Text style={[styles.sectionTitle, { color: fg }]}>Réservation</Text>
            <Row label="ID"        value={booking.id} />
            <Row label="Type"      value={booking.type === ResType.LOC ? 'Location journalière' : 'Transfert aéroport'} />
            <Row label="Véhicule"  value={`${booking.car?.name ?? '—'} (${booking.car?.registrationId ?? '—'})`} />
            <Row label="Départ"    value={fmtDate(booking.departureAt)} />
            <Row label="Retour"    value={fmtDate(booking.arrivalAt)} />
            {booking.rideStartAt && <Row label="Début course"  value={fmtDate(booking.rideStartAt)} />}
            {booking.rideEndAt   && <Row label="Fin course"    value={fmtDate(booking.rideEndAt)} />}
            <Row label="Total"     value={booking.total != null ? `${booking.total} j` : '—'} />
            <Row label="Payé"      value={booking.isPaid ? 'Oui' : 'Non'} />
          </View>

          {/* Lieux */}
          <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop :10 }]}>
            <Text style={[styles.sectionTitle, { color: fg }]}>Lieux</Text>
            <Row label="Départ"  value={booking.departure?.label ?? '—'} />
            <Row label="Arrivée" value={booking.arrival?.label  ?? '—'} />
            {booking.taVolNumber && <Row label="N° vol" value={booking.taVolNumber} />}
          </View>

          {/* Chauffeur */}
          {booking.driver && (
            <View style={[styles.card, { backgroundColor: bg, padding: 10 , marginTop :10}]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>Chauffeur</Text>
              <View style={styles.driverRow}>
                <Image
                  source={{ uri: driverAvatar ?? CAR_PLACEHOLDER }}
                  style={styles.driverAvatar}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[{ fontSize: 15, fontWeight: '600' }, { color: fg }]}>{driverName}</Text>
                  <Text style={[{ fontSize: 12 }, { color: sub }]}>
                    Permis : {booking.driver.licenseNumber ?? '—'}
                  </Text>
                  <Text style={[{ fontSize: 12 }, { color: sub }]}>
                    Statut : {booking.driver.status}
                  </Text>
                </View>
              </View>
              {driverPhone && (
                <View style={styles.contactRow}>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
                    onPress={() => Linking.openURL(`https://wa.me/${driverPhone.replace(/\D/g, '')}`)}
                  >
                    <Text style={styles.contactBtnText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#2196F3' }]}
                    onPress={() => Linking.openURL(`tel:${driverPhone}`)}
                  >
                    <Text style={styles.contactBtnText}>📞 Appeler</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Client */}
          {booking.client && (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop :10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>Client</Text>
              <Row label="Nom"      value={booking.client.full_name ?? '—'} />
              <Row label="Email"    value={booking.client.email} />
              <Row label="Tél"      value={booking.clientPhone ?? booking.client.phone ?? '—'} />
            </View>
          )}

          {/* Avis */}
          {booking.review && (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop :10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>Avis client</Text>
              <Row label="Conduite"   value={`${booking.review.ratingDriving}/5`} />
              <Row label="Ponctualité" value={`${booking.review.ratingPunctuality}/5`} />
              <Row label="Service"    value={`${booking.review.ratingService}/5`} />
              <Row label="Véhicule"   value={`${booking.review.ratingVehicle}/5`} />
              {booking.review.comment && <Row label="Commentaire" value={booking.review.comment} />}
            </View>
          )}

          {/* Coupon */}
          {booking.coupon && (
            <View style={[styles.card, { backgroundColor: bg, padding: 10 , marginTop :10}]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>Coupon</Text>
              <Row label="Réduction"  value={`-${booking.coupon.discountAmount} j`} />
              <Row label="Avant remise" value={`${booking.coupon.originalAmount} j`} />
            </View>
          )}

          {/* Commentaire */}
          {booking.commentaire ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop :10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>Commentaire</Text>
              <Text style={{ color: sub, fontSize: 13, lineHeight: 18 }}>{booking.commentaire}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Booking Card ────────────────────────────────────────────────────────────

function BookingCard({
  item,
  isDark,
  onPress,
}: {
  item: Booking;
  isDark: boolean;
  onPress: () => void;
}) {
  const bg  = isDark ? '#1c1c1e' : '#fff';
  const fg  = isDark ? '#fff'    : '#000';
  const sub = isDark ? '#aaa'    : '#666';
  const statusColor = STATUS_COLORS[item.status] ?? '#999';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg, flexDirection: 'row', padding: 12 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: getCarImage(item) }}
        style={styles.cardCarImage}
        resizeMode="cover"
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        {/* ID + status */}
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardId, { color: sub }]} numberOfLines={1}>{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        {/* Nom véhicule */}
        <Text style={[styles.cardCarName, { color: fg }]} numberOfLines={1}>
          {item.car?.name ?? '—'}
        </Text>

        {/* Départ */}
        <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
          🕐 {fmtTime(item.departureAt)}  ·  📅 {fmtDate(item.departureAt).split(' à ')[0]}
        </Text>

        {/* Lieux */}
        <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
          📍 {item.departure?.label ?? '—'}
        </Text>
        {item.arrival?.label && item.arrival?.label !== 'N/A' ? (
          <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
            🏁 {item.arrival.label}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

const SCREEN_OPTIONS = (isDark: boolean, onNotif: () => void) => ({
  title: 'Mes réservations',
  headerTransparent: false,
  headerRight: () => <NotificationIcon isDark={isDark} count={0} onPress={onNotif} />,
});

export default function Reservation() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Booking | null>(null);

  useEffect(() => {

    supabase.auth.getUser().then(({ data: { user } }) => {
     let userID='';
      if (user) {
        console.log('user', user.id);
       userID =user.id ;
      }

       getAllBookings(userID)
      .then((data) => setBookings(data))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger les réservations.'))
      .finally(() => setLoading(false));

    });

    }, []);
   
  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS(isDark, () => router.push('/notificationsPage'))} />
      <View style={[styles.screen, { backgroundColor: isDark ? '#000' : '#f2f2f7' }]}>
        {loading ? (
         <LoadingView />
      ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BookingCard item={item} isDark={isDark} onPress={() => setSelected(item)} />
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 60, color: isDark ? '#aaa' : '#555' }}>
                Aucune réservation.
              </Text>
            }
          />
        )}
      </View>

      {selected && (
        <BookingDetailModal
          booking={selected}
          isDark={isDark}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:            { flex: 1 },
  list:              { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginHorizontal: 0,
  },
  cardCarImage:      { width: 100, height: 80, borderRadius: 10 },
  cardTopRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardId:            { fontSize: 10, flex: 1, marginRight: 6 },
  cardCarName:       { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  cardMeta:          { fontSize: 12, marginTop: 2 },

  statusBadge:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusBadgeLarge:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginVertical: 12 },
  statusDot:         { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText:        { fontSize: 11, fontWeight: '600' },
  statusBadgeText:   { fontSize: 13, fontWeight: '600' },

  modalContainer:    { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 16,
  //borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  closeBtn:          { marginRight: 12 },
  modalTitle:        { fontSize: 17, fontWeight: '700' },
  modalScroll:       { padding: 16, paddingBottom: 40 },
  detailCarImage:    { width: '100%', height: 200, borderRadius: 14, marginBottom: 4 },
  sectionTitle:      { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  detailRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLabel:       { fontSize: 13, flex: 1 },
  detailValue:       { fontSize: 13, fontWeight: '500', flex: 2, textAlign: 'right' },
  driverRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  driverAvatar:      { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ccc' },
  contactRow:        { flexDirection: 'row', gap: 10, marginTop: 12 },
  contactBtn:        { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  contactBtnText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
});

