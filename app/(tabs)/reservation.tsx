import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

import {
  clientCancelBooking,
  createNewBooking,
  getAllBookings,
  maxicashVISA,
  pawapayPay,
} from '@/api/booking';
import { createReview } from '@/api/review';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { PaymentModal } from '@/components/my-ui/PaymentModal';
import { ReviewBookingModal } from '@/components/my-ui/ReviewBookingModal';
import { Button } from '@/components/ui/button';
import { color } from '@/constants/colors';
import { ClientType, PaymentProvider, ResStatus, ResType } from '@/constants/databaseEnum';
import {
  Booking,
  CreateBookingInput,
  CreateBookingResponse,
  PawapayPaymentResponse,
  PaymentMethod,
} from '@/constants/dataInterface';
import { useAnalytics } from '@/lib/analytics';
import { TranslationKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useMyStateUser } from '@/store/user-state';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ResStatus, string> = {
  [ResStatus.PENDING]: '#FFA500',
  [ResStatus.PENDINGDRIVER]: '#FFC107',
  [ResStatus.CONFIRMED]: '#2196F3',
  [ResStatus.STARTED]: '#9C27B0',
  [ResStatus.ENDED]: '#4CAF50',
  [ResStatus.CANCELED]: '#F44336',
  [ResStatus.ARCHIVED]: '#9E9E9E',
};

const STATUS_LABELS: Record<ResStatus, TranslationKey> = {
  [ResStatus.PENDING]: 'reservations.status.pending',
  [ResStatus.PENDINGDRIVER]: 'reservations.status.pendingDriver',
  [ResStatus.CONFIRMED]: 'reservations.status.confirmed',
  [ResStatus.STARTED]: 'reservations.status.started',
  [ResStatus.ENDED]: 'reservations.status.ended',
  [ResStatus.CANCELED]: 'reservations.status.canceled',
  [ResStatus.ARCHIVED]: 'reservations.status.archived',
};

function fmtDateTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDay(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

const UPCOMING_STATUSES: ResStatus[] = [
  ResStatus.PENDING,
  ResStatus.PENDINGDRIVER,
  ResStatus.CONFIRMED,
];

const ONGOING_STATUSES: ResStatus[] = [ResStatus.STARTED];

const CLIENT_CANCELLABLE_STATUSES: ResStatus[] = [
  ResStatus.PENDING,
  ResStatus.PENDINGDRIVER,
  ResStatus.CONFIRMED,
];

const PAST_STATUSES: ResStatus[] = [ResStatus.ENDED, ResStatus.CANCELED, ResStatus.ARCHIVED];

type ReservationTabRoute = 'upcoming' | 'ongoing' | 'past';

const ReservationTabs = createMaterialTopTabNavigator();

function getReservationTabRoute(status?: ResStatus | null): ReservationTabRoute {
  if (!status) {
    return 'upcoming';
  }

  if (ONGOING_STATUSES.includes(status)) {
    return 'ongoing';
  }

  if (PAST_STATUSES.includes(status)) {
    return 'past';
  }

  return 'upcoming';
}

function getPawapayFailureMessage(failureCode?: string | null) {
  return failureCode ?? 'UNKNOWN';
}

function isMobileMoneyPayment(paymentMethod: PaymentMethod) {
  return (
    paymentMethod === PaymentMethod.mpesa ||
    paymentMethod === PaymentMethod.orange ||
    paymentMethod === PaymentMethod.airtel
  );
}

function normalizePhone(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function canClientCancelBooking(booking: Booking) {
  if (!CLIENT_CANCELLABLE_STATUSES.includes(booking.status)) {
    return false;
  }

  if (!booking.departureAt) {
    return false;
  }

  const departureTime = new Date(booking.departureAt).getTime();

  if (Number.isNaN(departureTime)) {
    return false;
  }

  return departureTime - Date.now() >= 24 * 60 * 60 * 1000;
}

const CAR_PLACEHOLDER = 'https://via.placeholder.com/120x80';

function getCarImage(booking: Booking): string {
  const imgs = booking.car?.images;
  if (imgs && imgs.length > 0) return imgs[0] as string;
  return CAR_PLACEHOLDER;
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function BookingDetailModal({
  booking,
  isDark,
  disableStatusBar = false,
  onClose,
  onOpenReview,
  onOpenPayment,
  onClientCancelBooking,
  isCancelling,
  t,
  appLocale,
}: {
  booking: Booking;
  isDark: boolean;
  disableStatusBar?: boolean;
  onClose: () => void;
  onOpenReview: (booking: Booking) => void;
  onOpenPayment: (booking: Booking) => void;
  onClientCancelBooking: (booking: Booking) => void;
  isCancelling: boolean;
  t: (key: TranslationKey) => string;
  appLocale: string;
}) {
  const bg = isDark ? '#262626' : '#f2f2f7';
  const fg = isDark ? '#fff' : '#000';
  const sub = isDark ? '#aaa' : '#555';
  const sep = isDark ? '#333' : '#eee';
  const modalBg = isDark ? color.appDarkBackground : '#fff';

  const statusColor = STATUS_COLORS[booking.status] ?? '#999';

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.detailRow, { borderBottomColor: sep }]}>
      <Text style={[styles.detailLabel, { color: sub }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: fg }]}>{value}</Text>
    </View>
  );

  const driverUser = booking.driver?.user as Record<string, string> | undefined;
  const driverAvatar = driverUser?.avatar_url ?? null;
  const driverName = driverUser?.full_name ?? '—';
  const driverPhone = driverUser?.phone ?? null;
  const isStandardClient = booking.client?.clientType !== ClientType.PREMIUM;
  const canPayBooking = isStandardClient && !booking.isPaid;
  const canCancelBooking = canClientCancelBooking(booking);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      presentationStyle="formSheet"
      statusBarTranslucent={!disableStatusBar}>
      <View style={[styles.modalContainer, { backgroundColor: modalBg }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { backgroundColor: modalBg }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: fg, fontSize: 24 }}>× </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: fg, flex: 1, textAlign: 'center' }]}>
            {t('reservations.detailTitle')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Car image */}
          <Image
            source={{ uri: getCarImage(booking) }}
            style={styles.detailCarImage}
            resizeMode="cover"
          />

          {/* Status badge */}
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: statusColor + '22', borderColor: statusColor },
            ]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {t(STATUS_LABELS[booking.status] ?? 'reservations.status.pending')}
            </Text>
          </View>

          {/* Main info */}
          <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { color: fg }]}>
              {t('reservations.section.booking')}
            </Text>
            <Row label={t('reservations.field.id')} value={booking.id} />
            <Row
              label={t('reservations.field.type')}
              value={
                booking.type === ResType.LOC
                  ? t('reservations.type.dailyRental')
                  : t('reservations.type.airportTransfer')
              }
            />
            <Row
              label={t('reservations.field.vehicle')}
              value={`${booking.car?.name ?? '—'} (${booking.car?.registrationId ?? '—'})`}
            />
            <Row
              label={t('reservations.field.departure')}
              value={fmtDateTime(booking.departureAt, appLocale)}
            />
            <Row
              label={t('reservations.field.return')}
              value={fmtDateTime(booking.arrivalAt, appLocale)}
            />
            {booking.rideStartAt && (
              <Row
                label={t('reservations.field.rideStart')}
                value={fmtDateTime(booking.rideStartAt, appLocale)}
              />
            )}
            {booking.rideEndAt && (
              <Row
                label={t('reservations.field.rideEnd')}
                value={fmtDateTime(booking.rideEndAt, appLocale)}
              />
            )}
            <Row
              label={t('reservations.field.total')}
              value={booking.total != null ? `${booking.total} $` : '—'}
            />
            <Row
              label={t('reservations.field.paid')}
              value={booking.isPaid ? t('common.yes') : t('common.no')}
            />
          </View>

          {canPayBooking &&
          (booking.status === ResStatus.PENDING || booking.status === ResStatus.PENDINGDRIVER) ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 14, marginTop: 10 }]}>
              <Button
                className="h-11 rounded-xl bg-orange-500"
                onPress={() => onOpenPayment(booking)}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {t('reservations.payment.open')}
                </Text>
              </Button>
            </View>
          ) : null}

          {/* Lieux */}
          <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { color: fg }]}>
              {t('reservations.section.places')}
            </Text>
            <Row
              label={t('reservations.field.departure')}
              value={booking.departure?.label ?? '—'}
            />
            <Row label={t('reservations.field.arrival')} value={booking.arrival?.label ?? '—'} />
            {booking.taVolNumber && (
              <Row label={t('reservations.field.flightNumber')} value={booking.taVolNumber} />
            )}
          </View>

          {/* Chauffeur */}
          {booking.driver &&
            (booking.status === ResStatus.CONFIRMED || booking.status === ResStatus.STARTED) && (
              <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
                <Text style={[styles.sectionTitle, { color: fg }]}>
                  {t('reservations.section.driver')}
                </Text>
                <View style={styles.driverRow}>
                  <Image
                    source={{ uri: driverAvatar ?? CAR_PLACEHOLDER }}
                    style={styles.driverAvatar}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[{ fontSize: 15, fontWeight: '600' }, { color: fg }]}>
                      {driverName}
                    </Text>
                    <Text style={[{ fontSize: 12 }, { color: sub }]}>
                      {t('reservations.field.license')} : {booking.driver.licenseNumber ?? '—'}
                    </Text>
                    <Text style={[{ fontSize: 12 }, { color: sub }]}>
                      {t('reservations.field.status')} : {booking.driver.status}
                    </Text>
                  </View>
                </View>
                {driverPhone && (
                  <View style={styles.contactRow}>
                    <TouchableOpacity
                      style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
                      onPress={() =>
                        Linking.openURL(`https://wa.me/${driverPhone.replace(/\D/g, '')}`)
                      }>
                      <Text style={styles.contactBtnText}>💬 {t('settings.whatsapp')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.contactBtn, { backgroundColor: '#2196F3' }]}
                      onPress={() => Linking.openURL(`tel:${driverPhone}`)}>
                      <Text style={styles.contactBtnText}>📞 {t('settings.call')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

          {/* Client */}
          {booking.client && (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.client')}
              </Text>
              <Row label={t('reservations.field.name')} value={booking.client.full_name ?? '—'} />
              <Row label={t('reservations.field.email')} value={booking.client.email} />
              <Row
                label={t('reservations.field.phone')}
                value={booking.clientPhone ?? booking.client.phone ?? '—'}
              />
            </View>
          )}

          {/* Avis */}
          {booking.review && (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.review')}
              </Text>
              <Row
                label={t('reservations.field.driving')}
                value={`${booking.review.ratingDriving}/5`}
              />
              <Row
                label={t('reservations.field.punctuality')}
                value={`${booking.review.ratingPunctuality}/5`}
              />
              <Row
                label={t('reservations.field.service')}
                value={`${booking.review.ratingService}/5`}
              />
              <Row
                label={t('reservations.field.vehicle')}
                value={`${booking.review.ratingVehicle}/5`}
              />
              {booking.review.comment && (
                <Row label={t('reservations.section.comment')} value={booking.review.comment} />
              )}
            </View>
          )}

          {booking.status === ResStatus.ENDED && !booking.review && booking.driverId ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 14, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.reviewForm.ctaTitle')}
              </Text>
              <Text style={{ color: sub, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
                {t('reservations.reviewForm.ctaDescription')}
              </Text>
              <Button
                className="h-11 rounded-xl bg-orange-500"
                onPress={() => onOpenReview(booking)}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {t('reservations.reviewForm.open')}
                </Text>
              </Button>
            </View>
          ) : null}

          {/* Coupon */}
          {booking.coupon && (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.coupon')}
              </Text>
              <Row
                label={t('reservations.field.discount')}
                value={`-${booking.coupon.discountAmount} j`}
              />
              <Row
                label={t('reservations.field.beforeDiscount')}
                value={`${booking.coupon.originalAmount} j`}
              />
            </View>
          )}

          {/* Commentaire */}
          {booking.commentaire ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 10, marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                {t('reservations.section.comment')}
              </Text>
              <Text style={{ color: sub, fontSize: 13, lineHeight: 18 }}>
                {booking.commentaire}
              </Text>
            </View>
          ) : null}

          {/* Annuller la course */}
          {canCancelBooking ? (
            <View style={[styles.card, { backgroundColor: bg, padding: 14, marginTop: 10 }]}>
              <Button
                className="h-11 rounded-xl bg-red-500"
                onPress={() => onClientCancelBooking(booking)}
                disabled={isCancelling}>
                {isCancelling ? (
                  <View style={styles.cancelButtonContent}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}> Annulation...</Text>
                  </View>
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}> Annuler la course</Text>
                )}
              </Button>
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
  highlighted,
  badgeIsShow = false,
  onPress,
  t,
  appLocale,
}: {
  item: Booking;
  isDark: boolean;
  highlighted: boolean;
  badgeIsShow: boolean;
  onPress: () => void;
  t: (key: TranslationKey) => string;
  appLocale: string;
}) {
  const bg = isDark ? '#262626' : '#f3f4f6';
  const fg = isDark ? '#fff' : '#000';
  const sub = isDark ? '#aaa' : '#666';
  const statusColor = STATUS_COLORS[item.status] ?? '#999';
  const highlightColor = isDark ? '#f59e0b' : '#ff8a00';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: highlighted ? (isDark ? '#3a2a0a' : '#fff3d6') : bg,
          borderWidth: highlighted ? 1.5 : 0,
          borderColor: highlighted ? highlightColor : 'transparent',
          flexDirection: 'row',
          padding: 12,
          elevation: highlighted ? 4 : 1,
          shadowColor: highlighted ? highlightColor : '#000',
          shadowOpacity: highlighted ? 0.18 : 0.07,
          shadowRadius: highlighted ? 12 : 8,
          shadowOffset: { width: 0, height: 3 },
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Image source={{ uri: getCarImage(item) }} style={styles.cardCarImage} resizeMode="cover" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        {highlighted && badgeIsShow ? (
          <View style={[styles.highlightBadge, { backgroundColor: highlightColor }]}>
            <Text style={styles.highlightBadgeText}>Nouvelle reservation</Text>
          </View>
        ) : null}
        {/* ID + status */}
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardId, { color: sub }]} numberOfLines={1}>
            {item.id}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(STATUS_LABELS[item.status] ?? 'reservations.status.pending')}
            </Text>
          </View>
        </View>

        {/* Nom véhicule */}
        <Text style={[styles.cardCarName, { color: fg }]} numberOfLines={1}>
          {item.car?.name ?? '—'}
        </Text>

        {/* Départ */}
        <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
          🕐 {fmtTime(item.departureAt, appLocale)} · 📅 {fmtDay(item.departureAt, appLocale)}
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

function BookingListTab({
  bookings,
  isDark,
  activeHighlightId,
  rawShowBadge,
  refreshing,
  onRefresh,
  onSelectBooking,
  t,
  appLocale,
  emptyTitleKey,
  emptyDescriptionKey,
}: {
  bookings: Booking[];
  isDark: boolean;
  activeHighlightId: string | null;
  rawShowBadge: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectBooking: (booking: Booking) => void;
  t: (key: TranslationKey) => string;
  appLocale: string;
  emptyTitleKey: TranslationKey;
  emptyDescriptionKey: TranslationKey;
}) {
  const listRef = useRef<FlatList<Booking>>(null);

  useEffect(() => {
    if (!activeHighlightId || bookings.length === 0) {
      return;
    }

    const highlightedIndex = bookings.findIndex((booking) => booking.id === activeHighlightId);
    if (highlightedIndex < 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      listRef.current?.scrollToIndex({
        animated: true,
        index: highlightedIndex,
        viewPosition: 0.2,
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [activeHighlightId, bookings]);

  return (
    <FlatList
      ref={listRef}
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FE5900"
          colors={['#FE5900']}
        />
      }
      onScrollToIndexFailed={({ averageItemLength, index }) => {
        listRef.current?.scrollToOffset({
          animated: true,
          offset: averageItemLength * index,
        });
      }}
      renderItem={({ item }) => (
        <BookingCard
          item={item}
          isDark={isDark}
          highlighted={item.id === activeHighlightId}
          badgeIsShow={rawShowBadge}
          onPress={() => onSelectBooking(item)}
          t={t}
          appLocale={appLocale}
        />
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
      ListEmptyComponent={
        <ErrorEmpty isDark={isDark} title={t(emptyTitleKey)} description={t(emptyDescriptionKey)} />
      }
    />
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

const SCREEN_OPTIONS = (isDark: boolean, onNotif: () => void, title: string) => ({
  title,
  headerTransparent: false,
  headerRight: () => <NotificationIcon isDark={isDark} onPress={onNotif} />,
});

export default function Reservation() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const {
    highlightBookingId: rawHighlightBookingId,
    openBookingId: rawOpenBookingId,
    showBadgeId: rawShowBadgeId,
  } = useLocalSearchParams() as {
    highlightBookingId?: string | string[];
    openBookingId?: string | string[];
    showBadgeId?: string | string[];
  };
  const { t, appLocale } = useI18n();
  const analytics = useAnalytics();
  const storedUser = useMyStateUser((state) => state.user);
  const showBadgeId = Array.isArray(rawShowBadgeId) ? rawShowBadgeId[0] : rawShowBadgeId;
  const highlightBookingId = Array.isArray(rawHighlightBookingId)
    ? rawHighlightBookingId[0]
    : rawHighlightBookingId;
  const openBookingId = Array.isArray(rawOpenBookingId) ? rawOpenBookingId[0] : rawOpenBookingId;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Booking | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const loadBookings = async (clientId?: string) => {
    const data = await getAllBookings(clientId);
    setBookings(data);
  };

  const refreshBookings = async () => {
    try {
      setRefreshing(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await loadBookings(user?.id ?? '');
    } catch {
      Alert.alert(t('common.error'), t('reservations.loadError'));
    } finally {
      setRefreshing(false);
    }
  };

  const updateBookingState = (bookingId: string, updater: (booking: Booking) => Booking) => {
    setBookings((currentBookings) =>
      currentBookings.map((booking) => (booking.id === bookingId ? updater(booking) : booking))
    );

    setSelected((currentSelected) =>
      currentSelected && currentSelected.id === bookingId
        ? updater(currentSelected)
        : currentSelected
    );

    setPaymentTarget((currentPaymentTarget) =>
      currentPaymentTarget && currentPaymentTarget.id === bookingId
        ? updater(currentPaymentTarget)
        : currentPaymentTarget
    );
  };

  const closePaymentModal = (source: 'backdrop' | 'flow-exit' | 'completion' = 'backdrop') => {
    analytics.trackPaymentModalClosed({
      bookingId: paymentTarget?.id,
      reservationType: paymentTarget?.type,
      source,
    });
    setPaymentModalVisible(false);
  };

  const openPaymentModal = (booking: Booking) => {
    setSelected(null);
    setPaymentTarget(booking);
    analytics.trackPaymentModalOpened({
      bookingId: booking.id,
      reservationType: booking.type,
      totalPrice: booking.total ?? 0,
      carId: booking.carId ?? null,
      carName: booking.car?.name ?? null,
      hasGuest: Boolean(booking.guest && Object.keys(booking.guest).length > 0),
      hasComment: Boolean(booking.commentaire?.trim()),
    });
    setPaymentModalVisible(true);
  };

  const processExistingBookingPayment = async (
    bookingDetails: CreateBookingResponse,
    paymentMethod: PaymentMethod
  ) => {
    const paymentRecord =
      bookingDetails.payments?.find((payment) => payment.status !== 'COMPLETED') ??
      bookingDetails.payments?.[0];

    if (!paymentRecord) {
      throw new Error(t('reservations.payment.unavailable'));
    }

    if (isMobileMoneyPayment(paymentMethod)) {
      analytics.trackPaymentNetworkRequested({
        bookingId: bookingDetails.id,
        paymentMethod,
        provider: 'pawapay',
        transactionId: paymentRecord.transaction_id,
        amount: String(paymentRecord.amount),
        currency: paymentRecord.currency,
        phoneNumber: paymentRecord.paymentNumber,
      });

      let response: PawapayPaymentResponse;

      try {
        response = await pawapayPay({
          transaction_id: paymentRecord.transaction_id,
          amount: String(paymentRecord.amount),
          currency: paymentRecord.currency,
          paymentMethod: paymentRecord.paymentMethod,
          paymentNumber: paymentRecord.paymentNumber,
        });
      } catch (error: any) {
        analytics.trackPaymentNetworkFailed({
          bookingId: bookingDetails.id,
          paymentMethod,
          provider: 'pawapay',
          transactionId: paymentRecord.transaction_id,
          errorMessage: error?.message ?? 'pawapay_request_failed',
        });
        throw error;
      }

      analytics.trackPaymentNetworkResponded({
        bookingId: bookingDetails.id,
        paymentMethod,
        provider: 'pawapay',
        transactionId: paymentRecord.transaction_id,
        status: response.status ?? null,
        failureCode: response.failureReason?.failureCode ?? null,
        providerReference: response.depositId ?? null,
      });

      if (response.failureReason) {
        const failureCode = getPawapayFailureMessage(response.failureReason.failureCode);
        throw new Error(
          failureCode === 'PAYER_LIMIT_REACHED'
            ? t('payment.failure.payerLimitReached')
            : failureCode === 'PAYER_NOT_FOUND'
              ? t('payment.failure.payerNotFound')
              : failureCode === 'PAYMENT_NOT_APPROVED'
                ? t('payment.failure.notApproved')
                : failureCode === 'INSUFFICIENT_BALANCE'
                  ? t('payment.failure.insufficientBalance')
                  : t('payment.failure.unknown')
        );
      }

      const status = response.status?.toUpperCase?.() ?? '';
      if (status && status !== 'COMPLETED' && status !== 'SUCCESS') {
        throw new Error(t('payment.failure.unknown'));
      }

      updateBookingState(bookingDetails.id, (booking) => ({ ...booking, isPaid: true }));
      Alert.alert(t('reservations.payment.successTitle'), t('reservations.payment.successMessage'));
      return;
    }

    if (paymentMethod === PaymentMethod.card) {
      analytics.trackPaymentNetworkRequested({
        bookingId: bookingDetails.id,
        paymentMethod,
        provider: 'maxicash-card',
        transactionId: paymentRecord.transaction_id,
        amount: String(paymentRecord.amount),
        currency: paymentRecord.currency,
      });

      try {
        await maxicashVISA(
          paymentRecord.transaction_id,
          String(paymentRecord.amount),
          paymentRecord.currency,
          {
            name: storedUser?.full_name ?? undefined,
            email: storedUser?.email ?? undefined,
            phone: storedUser?.phone ?? undefined,
          }
        );
      } catch (error: any) {
        analytics.trackPaymentNetworkFailed({
          bookingId: bookingDetails.id,
          paymentMethod,
          provider: 'maxicash-card',
          transactionId: paymentRecord.transaction_id,
          errorMessage: error?.message ?? 'maxicash_card_request_failed',
        });
        throw error;
      }

      analytics.trackPaymentNetworkResponded({
        bookingId: bookingDetails.id,
        paymentMethod,
        provider: 'card',
        transactionId: paymentRecord.transaction_id,
        status: 'NOT_REQUIRED',
        failureCode: null,
        providerReference: null,
      });

      Alert.alert(t('reservations.payment.pendingTitle'), t('reservations.payment.pendingMessage'));
      return;
    }

    if (paymentMethod === PaymentMethod.cash) {
      Alert.alert(t('reservations.payment.pendingTitle'), t('reservations.payment.pendingMessage'));
    }
  };

  const handlePaymentSubmit = async (paymentMethod: PaymentMethod, phoneNumber?: string) => {
    if (!paymentTarget) {
      analytics.trackPaymentValidationFailed({ paymentMethod, reason: 'missing_payment_target' });
      return;
    }

    if (isMobileMoneyPayment(paymentMethod) && !phoneNumber?.trim()) {
      analytics.trackPaymentValidationFailed({
        bookingId: paymentTarget.id,
        reservationType: paymentTarget.type,
        paymentMethod,
        reason: 'missing_phone_number',
      });
      Alert.alert(t('payment.title'), t('booking.enterPhoneForMobilePayment'));
      return;
    }

    closePaymentModal('completion');
    setIsSubmittingPayment(true);

    try {
      const paymentProvider =
        paymentMethod === PaymentMethod.card
          ? PaymentProvider.card
          : paymentMethod === PaymentMethod.cash
            ? PaymentProvider.cash
            : PaymentProvider.mobileMoney;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const clientId = session?.user?.id ?? paymentTarget.clientId;

      if (!clientId) {
        throw new Error(t('booking.sessionMissing'));
      }

      const sanitizedArrival =
        paymentTarget.arrival &&
        typeof paymentTarget.arrival.label === 'string' &&
        paymentTarget.arrival.label.trim().length > 0
          ? paymentTarget.arrival
          : undefined;

      const createBookingPayload: CreateBookingInput = {
        id: paymentTarget.id,
        carId: paymentTarget.carId ?? '',
        clientId,
        clientPhone:
          normalizePhone(phoneNumber) ??
          normalizePhone(paymentTarget.clientPhone) ??
          normalizePhone(storedUser?.phone) ??
          normalizePhone(session?.user?.phone) ??
          normalizePhone(session?.user?.user_metadata?.phone),
        currency: 'USD',
        departure: paymentTarget.departure,
        departureAt: paymentTarget.departureAt,
        arrival: sanitizedArrival,
        arrivalAt: paymentTarget.arrivalAt ?? undefined,
        type: paymentTarget.type,
        status: paymentTarget.status,
        total: paymentTarget.total ?? 0,
        reference: paymentTarget.reference ?? undefined,
        taVolNumber: paymentTarget.taVolNumber ?? undefined,
        commentaire: paymentTarget.commentaire ?? undefined,
        guest: paymentTarget.guest ?? undefined,
        options: paymentTarget.options ?? undefined,
        taReturnId: paymentTarget.taReturnId ?? undefined,
        paymentMethod,
        paymentProvider,
        paymentNumber: normalizePhone(phoneNumber),
      };

      const bookingDetails = (await createNewBooking(
        createBookingPayload
      )) as CreateBookingResponse;
      const resolvedClientPhone =
        normalizePhone(phoneNumber) ??
        normalizePhone(paymentTarget.clientPhone) ??
        normalizePhone(storedUser?.phone) ??
        normalizePhone(bookingDetails.clientPhone) ??
        normalizePhone(bookingDetails.client?.phone);

      if (isMobileMoneyPayment(paymentMethod) && !resolvedClientPhone) {
        analytics.trackPaymentValidationFailed({
          bookingId: paymentTarget.id,
          reservationType: paymentTarget.type,
          paymentMethod,
          reason: 'missing_client_phone',
        });
        throw new Error(t('booking.enterPhoneForMobilePayment'));
      }

      const patchedBookingDetails: CreateBookingResponse = {
        ...bookingDetails,
        clientPhone: resolvedClientPhone ?? bookingDetails.clientPhone,
        payments:
          bookingDetails.payments?.map((payment) =>
            isMobileMoneyPayment(paymentMethod)
              ? {
                  ...payment,
                  paymentMethod,
                  paymentNumber: resolvedClientPhone ?? payment.paymentNumber,
                  paymentProvider: PaymentProvider.mobileMoney,
                }
              : paymentMethod === PaymentMethod.card
                ? { ...payment, paymentMethod, paymentProvider: PaymentProvider.card }
                : payment
          ) ?? [],
      };

      await processExistingBookingPayment(patchedBookingDetails, paymentMethod);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error && error.message ? error.message : t('payment.failure.unknown')
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => UPCOMING_STATUSES.includes(booking.status)),
    [bookings]
  );
  const ongoingBookings = useMemo(
    () => bookings.filter((booking) => ONGOING_STATUSES.includes(booking.status)),
    [bookings]
  );
  const pastBookings = useMemo(
    () => bookings.filter((booking) => PAST_STATUSES.includes(booking.status)),
    [bookings]
  );

  const focusedBookingId = openBookingId ?? highlightBookingId ?? null;
  const confirmedBooking = bookings.find((booking) => booking.status === ResStatus.STARTED) ?? null;
  console.log('Confirmed booking:', confirmedBooking);
  const focusedBooking =
    (focusedBookingId ? bookings.find((booking) => booking.id === focusedBookingId) : null) ??
    confirmedBooking;
  const autoHighlightBookingId = highlightBookingId ?? confirmedBooking?.id ?? null;
  const initialTabRoute = getReservationTabRoute(focusedBooking?.status);

  useEffect(() => {
    if (!autoHighlightBookingId) {
      setActiveHighlightId(null);
      return;
    }

    setActiveHighlightId(autoHighlightBookingId);
    const timeoutId = setTimeout(() => {
      setActiveHighlightId((currentId) =>
        currentId === autoHighlightBookingId ? null : currentId
      );
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [autoHighlightBookingId]);

  useEffect(() => {
    if (!openBookingId || loading || bookings.length === 0) {
      return;
    }

    const booking = bookings.find((item) => item.id === openBookingId);
    if (!booking) {
      return;
    }

    setSelected(booking);
  }, [openBookingId, bookings, loading]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const userID = user?.id ?? '';

      loadBookings(userID)
        .catch(() => Alert.alert(t('common.error'), t('reservations.loadError')))
        .finally(() => setLoading(false));
    });
  }, []);

  const handleReviewSubmit = async ({
    ratingDriving,
    ratingPunctuality,
    ratingService,
    ratingVehicle,
    comment,
  }: {
    ratingDriving: number;
    ratingPunctuality: number;
    ratingService: number;
    ratingVehicle: number;
    comment: string;
  }) => {
    if (!reviewTarget?.id || !reviewTarget.driverId) {
      Alert.alert(t('common.error'), t('reservations.reviewForm.unavailable'));
      return;
    }

    setIsSubmittingReview(true);

    try {
      const review = await createReview({
        bookingId: reviewTarget.id,
        driverId: reviewTarget.driverId,
        ratingDriving,
        ratingPunctuality,
        ratingService,
        ratingVehicle,
        comment,
      });

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === reviewTarget.id ? { ...booking, review } : booking
        )
      );

      setSelected((currentSelected) =>
        currentSelected && currentSelected.id === reviewTarget.id
          ? { ...currentSelected, review }
          : currentSelected
      );

      setReviewTarget(null);
      Alert.alert(
        t('reservations.reviewForm.successTitle'),
        t('reservations.reviewForm.successMessage')
      );
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error && error.message
          ? error.message
          : t('reservations.reviewForm.submitError')
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleClientCancelBooking = (booking: Booking) => {
    if (!canClientCancelBooking(booking)) {
      Alert.alert(
        t('common.error'),
        'Cette reservation ne peut etre annulee que 24h avant le depart.'
      );
      return;
    }

    Alert.alert('Annuler la course', 'Voulez-vous vraiment annuler cette course ?', [
      {
        text: t('common.no'),
        style: 'cancel',
      },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            setCancellingBookingId(booking.id);

            const {
              data: { user },
            } = await supabase.auth.getUser();
            const clientId = user?.id ?? booking.clientId;

            if (!clientId) {
              throw new Error(t('booking.sessionMissing'));
            }

            await clientCancelBooking(booking.id, booking.status, clientId);
            updateBookingState(booking.id, (currentBooking) => ({
              ...currentBooking,
              status: ResStatus.CANCELED,
            }));
            setSelected(null);
            Alert.alert('Succès', 'La course a ete annulee.');
          } catch (error) {
            Alert.alert(
              t('common.error'),
              error instanceof Error && error.message
                ? error.message
                : 'Impossible d annuler cette course.'
            );
          } finally {
            setCancellingBookingId(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={SCREEN_OPTIONS(
          isDark,
          () => router.push('/notificationsPage'),
          t('reservations.title')
        )}
      />
      <View
        style={[styles.screen, { backgroundColor: isDark ? color.appDarkBackground : '#ffffff' }]}>
        {loading ? (
          <LoadingView />
        ) : (
          <ReservationTabs.Navigator
            key={initialTabRoute}
            initialRouteName={initialTabRoute}
            screenOptions={{
              tabBarStyle: {
                backgroundColor: isDark ? color.appDarkBackground : '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: isDark ? color.appDarkBackground : '#e5e7eb',
              },
              tabBarIndicatorStyle: {
                backgroundColor: '#FE5900',
                height: 3,
                borderRadius: 999,
              },
              tabBarActiveTintColor: isDark ? '#ffffff' : '#111827',
              tabBarInactiveTintColor: isDark ? '#7c7c84' : '#6b7280',
              tabBarLabelStyle: {
                textTransform: 'none',
                fontSize: 13,
                fontWeight: '700',
              },
              tabBarPressColor: 'transparent',
              lazy: true,
              swipeEnabled: true,
              sceneStyle: {
                backgroundColor: isDark ? color.appDarkBackground : '#ffffff',
              },
            }}>
            <ReservationTabs.Screen
              name="upcoming"
              options={{ title: `${t('reservations.tab.upcoming')} (${upcomingBookings.length})` }}>
              {() => (
                <BookingListTab
                  bookings={upcomingBookings}
                  isDark={isDark}
                  activeHighlightId={activeHighlightId}
                  rawShowBadge={showBadgeId === activeHighlightId}
                  refreshing={refreshing}
                  onRefresh={refreshBookings}
                  onSelectBooking={setSelected}
                  t={t}
                  appLocale={appLocale}
                  emptyTitleKey="reservations.empty.upcoming.title"
                  emptyDescriptionKey="reservations.empty.upcoming.description"
                />
              )}
            </ReservationTabs.Screen>
            <ReservationTabs.Screen
              name="ongoing"
              options={{ title: `${t('reservations.tab.ongoing')} (${ongoingBookings.length})` }}>
              {() => (
                <BookingListTab
                  bookings={ongoingBookings}
                  isDark={isDark}
                  activeHighlightId={activeHighlightId}
                  rawShowBadge={showBadgeId === activeHighlightId}
                  refreshing={refreshing}
                  onRefresh={refreshBookings}
                  onSelectBooking={setSelected}
                  t={t}
                  appLocale={appLocale}
                  emptyTitleKey="reservations.empty.ongoing.title"
                  emptyDescriptionKey="reservations.empty.ongoing.description"
                />
              )}
            </ReservationTabs.Screen>
            <ReservationTabs.Screen
              name="past"
              options={{ title: `${t('reservations.tab.past')} (${pastBookings.length})` }}>
              {() => (
                <BookingListTab
                  bookings={pastBookings}
                  isDark={isDark}
                  activeHighlightId={activeHighlightId}
                  rawShowBadge={showBadgeId === activeHighlightId}
                  refreshing={refreshing}
                  onRefresh={refreshBookings}
                  onSelectBooking={setSelected}
                  t={t}
                  appLocale={appLocale}
                  emptyTitleKey="reservations.empty.past.title"
                  emptyDescriptionKey="reservations.empty.past.description"
                />
              )}
            </ReservationTabs.Screen>
          </ReservationTabs.Navigator>
        )}
      </View>

      {selected && (
        <BookingDetailModal
          booking={selected}
          isDark={isDark}
          onClose={() => setSelected(null)}
          onOpenReview={(booking) => setReviewTarget(booking)}
          onOpenPayment={openPaymentModal}
          onClientCancelBooking={handleClientCancelBooking}
          isCancelling={cancellingBookingId === selected.id}
          t={t}
          appLocale={appLocale}
        />
      )}

      {isSubmittingPayment ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#ff6600" />
            <Text style={styles.loadingTitle}>{t('booking.paymentProcessing')}</Text>
            <Text style={styles.loadingText}>{t('booking.paymentWaitingConfirmation')}</Text>
          </View>
        </View>
      ) : null}

      <PaymentModal
        visible={paymentModalVisible}
        isPremium={false}
        onClose={() => closePaymentModal('backdrop')}
        onSubmit={handlePaymentSubmit}
        submitting={isSubmittingPayment}
      />

      <ReviewBookingModal
        visible={reviewTarget !== null}
        booking={reviewTarget}
        isDark={isDark}
        submitting={isSubmittingReview}
        onClose={() => !isSubmittingReview && setReviewTarget(null)}
        onSubmit={handleReviewSubmit}
        t={t}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14181B',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
  },
  card: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginHorizontal: 0,
  },
  cardCarImage: { width: 100, height: 80, borderRadius: 10 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardId: { fontSize: 10, flex: 1, marginRight: 6 },
  cardCarName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  cardMeta: { fontSize: 12, marginTop: 2 },
  highlightBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  highlightBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 12,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 16,
    //borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  closeBtn: { marginRight: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalScroll: { padding: 16, paddingBottom: 40 },
  detailCarImage: { width: '100%', height: 200, borderRadius: 14, marginBottom: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '500', flex: 2, textAlign: 'right' },
  driverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  driverAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ccc' },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  contactBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
