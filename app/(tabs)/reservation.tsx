import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import {
  clientCancelBooking,
  createNewBooking,
  getAllBookings,
  maxicashVISA,
  pawapayPay,
} from '@/api/booking';
import { createReview } from '@/api/review';
import { BookingDetailSheet } from '@/components/my-ui/BookingDetailSheet';
import { BookingListCard } from '@/components/my-ui/BookingListCard';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { PaymentModal } from '@/components/my-ui/PaymentModal';
import { ReviewBookingModal } from '@/components/my-ui/ReviewBookingModal';
import { buildStackScreenOptions, HEADER_SIDE_WIDTH } from '@/components/my-ui/ScreenHeader';
import { color } from '@/constants/colors';
import { PaymentProvider, ResStatus } from '@/constants/databaseEnum';
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
import { useAppToast } from '@/lib/toast';
import { useMyStateUser } from '@/store/user-state';
import { BookingDetailModal } from '@/components/reservation/BookingDetailModal';
import { canClientCancelBooking } from '@/components/reservation/reservation-helpers';

type UserStoreState = ReturnType<typeof useMyStateUser.getState>;

// ─── helpers ────────────────────────────────────────────────────────────────

const UPCOMING_STATUSES: ResStatus[] = [
  ResStatus.PENDING,
  ResStatus.PENDINGDRIVER,
  ResStatus.CONFIRMED,
];

const ONGOING_STATUSES: ResStatus[] = [ResStatus.STARTED];

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

// ─── Booking List ────────────────────────────────────────────────────────────

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
  const [searchQuery, setSearchQuery] = useState('');
  const borderColor = isDark ? '#2f2f2f' : '#e5e7eb';
  const searchBg = isDark ? '#1E1E1E' : '#ffffff';
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';
  const inputColor = isDark ? '#ffffff' : '#111827';

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const haystack = [
        booking.id,
        booking.car?.name,
        booking.departure?.label,
        booking.arrival?.label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [bookings, searchQuery]);

  useEffect(() => {
    if (!activeHighlightId || filteredBookings.length === 0) {
      return;
    }

    const highlightedIndex = filteredBookings.findIndex(
      (booking) => booking.id === activeHighlightId
    );
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
  }, [activeHighlightId, filteredBookings]);

  return (
    <View style={styles.listScreen}>
      <View
        style={[
          styles.searchBar,
          {
            borderColor,
            backgroundColor: searchBg,
          },
        ]}>
        <Search size={18} color={placeholderColor} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('reservations.search.placeholder')}
          placeholderTextColor={placeholderColor}
          style={[styles.searchInput, { color: inputColor }]}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {filteredBookings.length === 0 ? (
        <ErrorEmpty isDark={isDark} title={t(emptyTitleKey)} description={t(emptyDescriptionKey)} />
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={color.primary}
              colors={[color.primary]}
            />
          }
          onScrollToIndexFailed={({ averageItemLength, index }) => {
            listRef.current?.scrollToOffset({
              animated: true,
              offset: averageItemLength * index,
            });
          }}
          renderItem={({ item }) => (
            <BookingListCard
              item={item}
              isDark={isDark}
              highlighted={item.id === activeHighlightId}
              badgeIsShow={rawShowBadge}
              onPress={() => onSelectBooking(item)}
              t={t}
              appLocale={appLocale}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

const SCREEN_OPTIONS = (isDark: boolean, onNotif: () => void, title: string) =>
  buildStackScreenOptions({
    title,
    isDark,
    headerRight: () => (
      <View style={{ width: HEADER_SIDE_WIDTH, alignItems: 'flex-end' }}>
        <NotificationIcon isDark={isDark} onPress={onNotif} />
      </View>
    ),
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
  const toast = useAppToast();
  const analytics = useAnalytics();
  const storedUser = useMyStateUser((state: UserStoreState) => state.user);
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
      toast({
        title: t('common.error'),
        description: t('reservations.loadError'),
        action: 'error',
      });
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
      toast({
        title: t('reservations.payment.successTitle'),
        description: t('reservations.payment.successMessage'),
        action: 'success',
      });
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

      toast({
        title: t('reservations.payment.pendingTitle'),
        description: t('reservations.payment.pendingMessage'),
        action: 'warning',
      });
      return;
    }

    if (paymentMethod === PaymentMethod.cash) {
      toast({
        title: t('reservations.payment.pendingTitle'),
        description: t('reservations.payment.pendingMessage'),
        action: 'warning',
      });
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
      toast({
        title: t('payment.title'),
        description: t('booking.enterPhoneForMobilePayment'),
        action: 'info',
      });
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

      const resolvedClientPhone =
        normalizePhone(phoneNumber) ??
        normalizePhone(paymentTarget.clientPhone) ??
        normalizePhone(storedUser?.phone) ??
        normalizePhone(session?.user?.phone) ??
        normalizePhone(session?.user?.user_metadata?.phone) ??
        '';

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

      const bookingDetails = (await createNewBooking(
        createBookingPayload
      )) as CreateBookingResponse;
      const resolvedPaymentClientPhone =
        normalizePhone(phoneNumber) ??
        normalizePhone(paymentTarget.clientPhone) ??
        normalizePhone(storedUser?.phone) ??
        normalizePhone(bookingDetails.clientPhone) ??
        normalizePhone(bookingDetails.client?.phone) ??
        resolvedClientPhone;

      if (isMobileMoneyPayment(paymentMethod) && !resolvedPaymentClientPhone) {
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
        clientPhone: resolvedPaymentClientPhone || bookingDetails.clientPhone,
        payments:
          bookingDetails.payments?.map((payment) =>
            isMobileMoneyPayment(paymentMethod)
              ? {
                  ...payment,
                  paymentMethod,
                  paymentNumber: resolvedPaymentClientPhone || payment.paymentNumber,
                  paymentProvider: PaymentProvider.mobileMoney,
                }
              : paymentMethod === PaymentMethod.card
                ? { ...payment, paymentMethod, paymentProvider: PaymentProvider.card }
                : payment
          ) ?? [],
      };

      await processExistingBookingPayment(patchedBookingDetails, paymentMethod);
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error && error.message ? error.message : t('payment.failure.unknown'),
        action: 'error',
      });
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
        .catch(() =>
          toast({
            title: t('common.error'),
            description: t('reservations.loadError'),
            action: 'error',
          })
        )
        .finally(() => setLoading(false));
    });
  }, [t, toast]);

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
      toast({
        title: t('common.error'),
        description: t('reservations.reviewForm.unavailable'),
        action: 'error',
      });
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
      toast({
        title: t('reservations.reviewForm.successTitle'),
        description: t('reservations.reviewForm.successMessage'),
        action: 'success',
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error && error.message
            ? error.message
            : t('reservations.reviewForm.submitError'),
        action: 'error',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleClientCancelBooking = (booking: Booking) => {
    if (!canClientCancelBooking(booking)) {
      toast({
        title: t('common.error'),
        description: 'Cette reservation ne peut etre annulee que 24h avant le depart.',
        action: 'error',
      });
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
            toast({
              title: 'Succès',
              description: 'La course a ete annulee.',
              action: 'success',
            });
          } catch (error) {
            toast({
              title: t('common.error'),
              description:
                error instanceof Error && error.message
                  ? error.message
                  : 'Impossible d annuler cette course.',
              action: 'error',
            });
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
                borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb',
              },
              tabBarIndicatorStyle: {
                backgroundColor: color.primary,
                height: 3,
                borderRadius: 999,
              },
              tabBarActiveTintColor: color.primary,
              tabBarInactiveTintColor: '#6B7280',
              tabBarLabelStyle: {
                textTransform: 'none',
                fontSize: 14,
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

      <BookingDetailSheet
        booking={selected}
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        onOpenReview={(booking) => setReviewTarget(booking)}
        onOpenPayment={openPaymentModal}
        onClientCancelBooking={handleClientCancelBooking}
        isCancelling={selected !== null && cancellingBookingId === selected.id}
        t={t}
        appLocale={appLocale}
      />

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
  listScreen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  listSeparator: { height: 12 },
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
