import {
  View,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useColorScheme } from 'nativewind';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { clientCancelBooking, getAllBookings, createNewBooking, maxicashVISA, pawapayPay } from '@/api/booking';
import { useEffect, useMemo, useState } from 'react';
import { Booking, CreateBookingInput, CreateBookingResponse, PaymentMethod, PawapayPaymentResponse } from '@/constants/dataInterface';
import { PaymentProvider, ResStatus } from '@/constants/databaseEnum';
import { color } from '@/constants/colors';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { ReviewBookingModal } from '@/components/my-ui/ReviewBookingModal';
import { PaymentModal } from '@/components/my-ui/PaymentModal';
import { createReview } from '@/api/review';
import { useAnalytics } from '@/lib/analytics';
import { useMyStateUser } from '@/store/user-state';
import { BookingDetailModal } from '@/components/reservation/BookingDetailModal';
import { BookingListTab } from '@/components/reservation/BookingListTab';
import { canClientCancelBooking } from '@/components/reservation/reservation-helpers';

// ─── helpers ────────────────────────────────────────────────────────────────

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

const PAST_STATUSES: ResStatus[] = [
  ResStatus.ENDED,
  ResStatus.CANCELED,
  ResStatus.ARCHIVED,
];

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
  return paymentMethod === PaymentMethod.mpesa
    || paymentMethod === PaymentMethod.orange
    || paymentMethod === PaymentMethod.airtel;
}

function normalizePhone(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

const SCREEN_OPTIONS = (isDark: boolean, onNotif: () => void, title: string) => ({
  title,
  headerTransparent: false,
  headerRight: () => <NotificationIcon isDark={isDark}  onPress={onNotif} />,
});

export default function Reservation() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { highlightBookingId: rawHighlightBookingId, openBookingId: rawOpenBookingId, showBadgeId: rawShowBadgeId } = useLocalSearchParams() as { highlightBookingId?: string | string[]; openBookingId?: string | string[]; showBadgeId?: string | string[] };
  const { t, appLocale } = useI18n();
  const analytics = useAnalytics();
  const storedUser = useMyStateUser((state) => state.user);
  const showBadgeId = Array.isArray(rawShowBadgeId)
    ? rawShowBadgeId[0]
    : rawShowBadgeId;
  const highlightBookingId = Array.isArray(rawHighlightBookingId)
    ? rawHighlightBookingId[0]
    : rawHighlightBookingId;
  const openBookingId = Array.isArray(rawOpenBookingId)
    ? rawOpenBookingId[0]
    : rawOpenBookingId;

  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,  setSelected]  = useState<Booking | null>(null);
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
      const { data: { user } } = await supabase.auth.getUser();
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
      currentSelected && currentSelected.id === bookingId ? updater(currentSelected) : currentSelected
    );

    setPaymentTarget((currentPaymentTarget) =>
      currentPaymentTarget && currentPaymentTarget.id === bookingId ? updater(currentPaymentTarget) : currentPaymentTarget
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
    setSelected(null)
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
    const paymentRecord = bookingDetails.payments?.find((payment) => payment.status !== 'COMPLETED')
      ?? bookingDetails.payments?.[0];

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
      const paymentProvider = paymentMethod === PaymentMethod.card
        ? PaymentProvider.card
        : paymentMethod === PaymentMethod.cash
          ? PaymentProvider.cash
          : PaymentProvider.mobileMoney;

      const { data: { session } } = await supabase.auth.getSession();
      const clientId = session?.user?.id ?? paymentTarget.clientId;

      if (!clientId) {
        throw new Error(t('booking.sessionMissing'));
      }

      const sanitizedArrival = paymentTarget.arrival
        && typeof paymentTarget.arrival.label === 'string'
        && paymentTarget.arrival.label.trim().length > 0
        ? paymentTarget.arrival
        : undefined;

      const resolvedClientPhone = normalizePhone(phoneNumber)
        ?? normalizePhone(paymentTarget.clientPhone)
        ?? normalizePhone(storedUser?.phone)
        ?? normalizePhone(session?.user?.phone)
        ?? normalizePhone(session?.user?.user_metadata?.phone)
        ?? '';

      const createBookingPayload: CreateBookingInput = {
        id: paymentTarget.id,
        carId: paymentTarget.carId ?? '',
        clientId,
        clientPhone: resolvedClientPhone,
        currency: 'USD',
        departure: paymentTarget.departure,
        departureAt: paymentTarget.departureAt,
        arrival: sanitizedArrival,
        arrivalAt: paymentTarget.arrivalAt ?? undefined,
        type: paymentTarget.type,
        status: paymentTarget.status,
        originalTotal: paymentTarget.originalTotal ?? undefined,
        total: paymentTarget.total ?? 0,
        reference: paymentTarget.reference ?? undefined,
        taVolNumber: paymentTarget.taVolNumber ?? undefined,
        taReturn: paymentTarget.taReturn ?? undefined,
        taReturnAt: paymentTarget.taReturnAt ?? undefined,
        commentaire: paymentTarget.commentaire ?? undefined,
        couponCode: paymentTarget.couponCode ?? undefined,
        couponVehicleAmount: paymentTarget.couponVehicleAmount ?? undefined,
        guest: paymentTarget.guest ?? undefined,
        options: paymentTarget.options ?? undefined,
        paymentMethod,
        paymentProvider,
        paymentNumber: normalizePhone(phoneNumber),
      };

      const bookingDetails = await createNewBooking(createBookingPayload) as CreateBookingResponse;
      const resolvedBookingClientPhone = normalizePhone(phoneNumber)
        ?? normalizePhone(paymentTarget.clientPhone)
        ?? normalizePhone(storedUser?.phone)
        ?? normalizePhone(bookingDetails.clientPhone)
        ?? normalizePhone(bookingDetails.client?.phone);

      if (isMobileMoneyPayment(paymentMethod) && !resolvedBookingClientPhone) {
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
        payments: bookingDetails.payments?.map((payment) =>
          isMobileMoneyPayment(paymentMethod)
            ? { ...payment, paymentMethod, paymentNumber: resolvedClientPhone ?? payment.paymentNumber, paymentProvider: PaymentProvider.mobileMoney }
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
  const focusedBooking = (focusedBookingId
    ? bookings.find((booking) => booking.id === focusedBookingId)
    : null) ?? confirmedBooking;
  const autoHighlightBookingId = highlightBookingId ?? confirmedBooking?.id ?? null;
  const initialTabRoute = getReservationTabRoute(focusedBooking?.status);

  useEffect(() => {
    if (!autoHighlightBookingId) {
      setActiveHighlightId(null);
      return;
    }

    setActiveHighlightId(autoHighlightBookingId);
    const timeoutId = setTimeout(() => {
      setActiveHighlightId((currentId) => currentId === autoHighlightBookingId ? null : currentId);
    }, 15000);

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
      Alert.alert(t('reservations.reviewForm.successTitle'), t('reservations.reviewForm.successMessage'));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error && error.message ? error.message : t('reservations.reviewForm.submitError')
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleClientCancelBooking = (booking: Booking) => {
    if (!canClientCancelBooking(booking)) {
      Alert.alert(t('common.error'), 'Cette reservation ne peut etre annulee que 24h avant le depart.');
      return;
    }

    Alert.alert(
      'Annuler la course',
      'Voulez-vous vraiment annuler cette course ?',
      [
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

              const { data: { user } } = await supabase.auth.getUser();
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
                error instanceof Error && error.message ? error.message : 'Impossible d annuler cette course.'
              );
            } finally {
              setCancellingBookingId(null);
            }
          },
        },
      ]
    );
  };
   
  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS(isDark, () => router.push('/notificationsPage'), t('reservations.title'))} />
      <View style={[styles.screen, { backgroundColor: isDark ? color.appDarkBackground : '#ffffff' }]}>
        {loading ? (
         <LoadingView />
       ) : (
          <ReservationTabs.Navigator
            key={initialTabRoute}
            initialRouteName={initialTabRoute}
            screenOptions={{
              tabBarStyle: {
                backgroundColor: isDark ?  color.appDarkBackground  : '#ffffff',
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
            }}
          >
            <ReservationTabs.Screen
              name="upcoming"
              options={{ title: `${t('reservations.tab.upcoming')} (${upcomingBookings.length})` }}
            >
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
              options={{ title: `${t('reservations.tab.ongoing')} (${ongoingBookings.length})` }}
            >
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
              options={{ title: `${t('reservations.tab.past')} (${pastBookings.length})` }}
            >
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
  screen:            { flex: 1 },
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
});

