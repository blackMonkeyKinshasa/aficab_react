import { useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { createNewBooking, maxicashVISA, pawapayPay } from '@/api/booking';
import { bookingSheetContentClassName } from '@/components/my-ui/BookingSheetLayout';
import { LocAirport } from '@/components/my-ui/LocAirport';
import { LocDaily } from '@/components/my-ui/LocDaily';
import { PaymentModal } from '@/components/my-ui/PaymentModal';
import { ReservationConfirmedScreen } from '@/components/my-ui/ReservationConfirmed';
import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import {
  ClientType,
  EtapeReservation,
  PaymentMethod,
  PaymentProvider,
  ResType,
} from '@/constants/databaseEnum';
import {
  Booking,
  CreateBookingResponse,
  PawapayPaymentResponse,
} from '@/constants/dataInterface';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { useMyStateUser } from '@/store/user-state';

const PREVIOUS_ETAPE: Record<EtapeReservation, EtapeReservation> = {
  [EtapeReservation.DETAILS]: EtapeReservation.DETAILS,
  [EtapeReservation.SELECTION]: EtapeReservation.DETAILS,
  [EtapeReservation.OPTION]: EtapeReservation.SELECTION,
  [EtapeReservation.RECAP]: EtapeReservation.OPTION,
};

function parseResType(value: string | string[] | undefined): ResType | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === ResType.TA || raw === ResType.LOC) {
    return raw;
  }
  return null;
}

const SCREEN_OPTIONS = (title: string, isDark: boolean, onPress: () => void) =>
  buildStackScreenOptions({
    title,
    isDark,
    canGoBack: true,
    onBack: onPress,
  });

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

type ConfirmationState = {
  bookingId?: string;
  userName?: string;
  email?: string;
  client?: Record<string, unknown>;
  booking?: Booking;
};

type UserStoreState = ReturnType<typeof useMyStateUser.getState>;

export default function NewBooking() {
  const { t } = useI18n();
  const toast = useAppToast();
  const router = useRouter();
  const { doc: docParam } = useLocalSearchParams() as { doc?: string | string[] };
  const bookingType = parseResType(docParam);

  const isDarkMode = useColorScheme() === 'dark';
  const [etape, setEtape] = useState<EtapeReservation>(EtapeReservation.DETAILS);
  const [bookingDoc, setBookingDoc] = useState<Booking | null>(null);
  const ETAPE_TITLES: Record<EtapeReservation, string> = {
    [EtapeReservation.DETAILS]: bookingType === ResType.LOC ? t('booking.stepDetailsLocation') : t('booking.stepDetailsAirport'),
    [EtapeReservation.SELECTION]: t('booking.vehicleScreenTitle'),
    [EtapeReservation.OPTION]: t('booking.optionsScreenTitle'),
    [EtapeReservation.RECAP]: t('booking.stepRecap'),
  };
  const title = ETAPE_TITLES[etape];
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationState, setConfirmationState] = useState<ConfirmationState | null>(null);
  const analytics = useAnalytics();
  const storedUser = useMyStateUser((state: UserStoreState) => state.user);

  const closePaymentModal = (source: 'backdrop' | 'flow-exit' | 'completion' = 'backdrop') => {
    analytics.trackPaymentModalClosed({
      bookingId: bookingDoc?.id,
      reservationType: bookingDoc?.type,
      source,
    });
    setPaymentModalVisible(false);
  };

  const onSubmitDocBooking = (doc: Booking) => {
    Keyboard.dismiss();
    setBookingDoc(doc);
    analytics.trackPaymentModalOpened({
      bookingId: doc.id,
      reservationType: doc.type,
      totalPrice: doc.total ?? 0,
      carId: doc.carId ?? null,
      carName: doc.car?.name ?? null,
      hasGuest: Boolean(doc.guest?.fullName || doc.guest?.phone),
      hasComment: Boolean(doc.commentaire?.trim()),
    });
    setPaymentModalVisible(true);
  };

  const onSubmitPayement = async (paymentMethod: PaymentMethod, phoneNumber?: string) => {
    if (!bookingDoc) {
      analytics.trackPaymentValidationFailed({
        paymentMethod,
        reason: 'missing_booking_doc',
      });
      return;
    }

    if (isMobileMoneyPayment(paymentMethod) && !phoneNumber?.trim()) {
      analytics.trackPaymentValidationFailed({
        bookingId: bookingDoc.id,
        reservationType: bookingDoc.type,
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
    setSubmitting(true);
    const paymentProvider =
      paymentMethod === PaymentMethod.card
        ? PaymentProvider.card
        : paymentMethod === PaymentMethod.cash
          ? PaymentProvider.cash
          : PaymentProvider.mobileMoney;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const clientId = session?.user?.id;
      const resolvedClientPhone =
        normalizePhone(bookingDoc.clientPhone) ??
        normalizePhone(phoneNumber) ??
        normalizePhone(storedUser?.phone) ??
        normalizePhone(session?.user?.phone) ??
        normalizePhone(session?.user?.user_metadata?.phone);

      if (!resolvedClientPhone) {
        analytics.trackPaymentValidationFailed({
          bookingId: bookingDoc.id,
          reservationType: bookingDoc.type,
          paymentMethod,
          reason: 'missing_client_phone',
        });
        throw new Error(t('booking.enterPhoneForMobilePayment'));
      }

      const confirmationDetails: ConfirmationState = {
        bookingId: bookingDoc.id,
        userName: session?.user?.user_metadata?.full_name ?? undefined,
        email: session?.user?.email ?? undefined,
        client: {
          id: session?.user?.id ?? undefined,
          name: session?.user?.user_metadata?.full_name ?? undefined,
          email: session?.user?.email ?? undefined,
          phone: resolvedClientPhone,
        },
      };

      if (!clientId) {
        analytics.trackBookingCreationFailed({
          bookingId: bookingDoc.id,
          reservationType: bookingDoc.type,
          paymentMethod,
          paymentProvider,
          errorMessage: 'missing_authenticated_user',
        });
        throw new Error(t('booking.sessionMissing'));
      }

      analytics.trackBookingCreationRequested({
        bookingId: bookingDoc.id,
        reservationType: bookingDoc.type,
        paymentMethod,
        paymentProvider,
        totalPrice: bookingDoc.total ?? 0,
        carId: bookingDoc.carId ?? null,
        clientId,
        hasGuest: Boolean(bookingDoc.guest?.fullName || bookingDoc.guest?.phone),
        hasComment: Boolean(bookingDoc.commentaire?.trim()),
      });

      const response = await createNewBooking({
        id: bookingDoc.id,
        carId: bookingDoc.carId ?? '',
        clientId: clientId ?? '',
        clientPhone: resolvedClientPhone,
        currency: 'USD',
        departure: bookingDoc.departure,
        departureAt: bookingDoc.departureAt,
        arrival: bookingDoc.arrival ?? undefined,
        arrivalAt: bookingDoc.arrivalAt ?? undefined,
        type: bookingDoc.type,
        status: bookingDoc.status,
        total: bookingDoc.total ?? 0,
        originalTotal: bookingDoc.originalTotal ?? undefined,
        reference: bookingDoc.reference ?? undefined,
        taVolNumber: bookingDoc.taVolNumber ?? undefined,
        taReturn: bookingDoc.taReturn ?? undefined,
        taReturnAt: bookingDoc.taReturnAt ?? undefined,
        commentaire: bookingDoc.commentaire ?? undefined,
        couponCode: bookingDoc.couponCode ?? undefined,
        couponVehicleAmount: bookingDoc.couponVehicleAmount ?? undefined,
        guest: bookingDoc.guest ?? undefined,
        options: bookingDoc.options ?? undefined,
        paymentMethod: paymentMethod,
        paymentProvider,
        paymentNumber: phoneNumber,
      });
      confirmationDetails.bookingId = response.id ?? bookingDoc.id;
      confirmationDetails.booking = response;
      analytics.trackBookingCreationSucceeded({
        bookingId: response.id ?? bookingDoc.id,
        reservationType: bookingDoc.type,
        paymentMethod,
        paymentProvider,
        totalPrice: bookingDoc.total ?? 0,
        paymentRecordsCount: response.payments?.length ?? 0,
      });
      analytics.trackBookingConfirmed(response.id ?? bookingDoc.id, {
        reservationType: bookingDoc.type,
        carName: bookingDoc.car?.name ?? t('booking.vehicleUnknown'),
        totalPrice: bookingDoc.total ?? 0,
        paymentMethod,
        origin: bookingDoc.departure?.label,
        destination: bookingDoc.arrival?.label ?? undefined,
      });

      if (response.payments?.[0]) {
        await processPayment(response, paymentMethod, confirmationDetails);
      } else {
        setConfirmationState(confirmationDetails);
      }

      // setPaymentModalVisible(false);
      //  router.replace('/(tabs)/reservation');
    } catch (err: any) {
      analytics.trackBookingCreationFailed({
        bookingId: bookingDoc.id,
        reservationType: bookingDoc.type,
        paymentMethod,
        paymentProvider,
        errorMessage: err?.message ?? 'booking_creation_failed',
      });
      toast({
        title: t('common.error'),
        description: err?.message ?? t('auth.genericError'),
        action: 'error',
      });
      console.error('Erreur lors de la création de la réservation :', err);
    } finally {
      setSubmitting(false);
    }
  };

  const processPayment = async (
    booking: CreateBookingResponse,
    paymentMethod: PaymentMethod,
    confirmationDetails: ConfirmationState
  ) => {
    const paiement = booking.payments?.[0];

    if (!paiement) {
      return;
    }

    if (isMobileMoneyPayment(paymentMethod)) {
      analytics.trackPaymentNetworkRequested({
        bookingId: booking.id,
        paymentMethod,
        provider: 'pawapay',
        transactionId: paiement.transaction_id,
        amount: String(paiement.amount),
        currency: paiement.currency,
        phoneNumber: paiement.paymentNumber,
      });

      let response: PawapayPaymentResponse;

      try {
        response = await pawapayPay({
          transaction_id: paiement.transaction_id,
          amount: String(paiement.amount),
          currency: paiement.currency,
          paymentMethod: paiement.paymentMethod,
          paymentNumber: paiement.paymentNumber,
        });
      } catch (error: any) {
        analytics.trackPaymentNetworkFailed({
          bookingId: booking.id,
          paymentMethod,
          provider: 'pawapay',
          transactionId: paiement.transaction_id,
          errorMessage: error?.message ?? 'pawapay_request_failed',
        });
        throw error;
      }
      analytics.trackPaymentNetworkResponded({
        bookingId: booking.id,
        paymentMethod,
        provider: 'pawapay',
        transactionId: paiement.transaction_id,
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

      setConfirmationState(confirmationDetails);

      return;
    }

    if (paymentMethod === PaymentMethod.cash) {
      analytics.trackPaymentNetworkResponded({
        bookingId: booking.id,
        paymentMethod,
        provider: 'cash',
        transactionId: paiement.transaction_id,
        status: 'NOT_REQUIRED',
        failureCode: null,
        providerReference: null,
      });
      setConfirmationState(confirmationDetails);
      return;
    }

    if (paymentMethod === PaymentMethod.card) {
      analytics.trackPaymentNetworkRequested({
        bookingId: booking.id,
        paymentMethod,
        provider: 'maxicash-card',
        transactionId: paiement.transaction_id,
        amount: String(paiement.amount),
        currency: paiement.currency,
      });

      try {
        await maxicashVISA(paiement.transaction_id, String(paiement.amount), paiement.currency, {
          name: storedUser?.full_name ?? undefined,
          email: storedUser?.email ?? undefined,
          phone: storedUser?.phone ?? undefined,
        });
      } catch (error: any) {
        analytics.trackPaymentNetworkFailed({
          bookingId: booking.id,
          paymentMethod,
          provider: 'maxicash-card',
          transactionId: paiement.transaction_id,
          errorMessage: error?.message ?? 'maxicash_card_request_failed',
        });
        throw error;
      }

      analytics.trackPaymentNetworkResponded({
        bookingId: booking.id,
        paymentMethod,
        provider: 'card',
        transactionId: paiement.transaction_id,
        status: 'NOT_REQUIRED',
        failureCode: null,
        providerReference: null,
      });

      setConfirmationState(confirmationDetails);
      return;
    }
  };

  const handleHeaderBackPress = () => {
    Keyboard.dismiss();

    if (etape !== EtapeReservation.DETAILS) {
      setEtape(PREVIOUS_ETAPE[etape]);
      return;
    }

    if (paymentModalVisible) {
      closePaymentModal('flow-exit');
    }

    router.back();
  };

  if (!bookingType) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>{t('booking.missingData')}</Text>
      </View>
    );
  }

  if (confirmationState) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReservationConfirmedScreen
          userName={confirmationState.userName}
          email={confirmationState.email}
          booking={bookingDoc ?? undefined}
          onPressMyBookings={() =>
            router.replace({
              pathname: '/(tabs)/reservation',
              params: confirmationState.bookingId
                ? {
                    highlightBookingId: confirmationState.bookingId,
                    showBadgeId: confirmationState.bookingId,
                  }
                : undefined,
            })
          }
          onPressContact={() => router.replace('/(tabs)/settings')}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          ...SCREEN_OPTIONS(title, isDarkMode, handleHeaderBackPress),
          headerShown: true,
          headerBackTitle: t('booking.back'),
        }}
      />
      <View style={styles.container}>
        <View
          className={
            etape === EtapeReservation.SELECTION || etape === EtapeReservation.OPTION
              ? `flex-1 ${bookingSheetContentClassName}`
              : 'flex-1'
          }
          style={styles.container}>
          {bookingType === ResType.LOC ? (
            <LocDaily
              isDarkMode={isDarkMode}
              onSubmit={onSubmitDocBooking}
              etape={etape}
              setEtape={setEtape}
            />
          ) : (
            <LocAirport
              isDarkMode={isDarkMode}
              onSubmit={onSubmitDocBooking}
              etape={etape}
              setEtape={setEtape}
            />
          )}
        </View>

        {submitting ? (
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
          isPremium={storedUser?.clientType === ClientType.PREMIUM}
          amount={bookingDoc?.total ?? null}
          onClose={() => closePaymentModal('backdrop')}
          onSubmit={onSubmitPayement}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
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
