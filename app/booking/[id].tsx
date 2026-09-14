import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { PackageOpen } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { createNewBooking, maxicashVISA, pawapayPay } from '@/api/booking';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { PaymentModal } from '@/components/my-ui/PaymentModal';
import { ReviewBookingModal } from '@/components/my-ui/ReviewBookingModal';
import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import { TripSummaryView } from '@/components/my-ui/TripSummaryView';
import { canClientCancelBooking } from '@/components/reservation/reservation-helpers';
import { color } from '@/constants/colors';
import { ClientType, PaymentProvider, SUPPORT_PHONE } from '@/constants/databaseEnum';
import {
  Booking,
  CreateBookingInput,
  CreateBookingResponse,
  PaymentMethod,
  PawapayPaymentResponse,
} from '@/constants/dataInterface';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { POLLING } from '@/lib/query/polling';
import { queryKeys } from '@/lib/query/query-keys';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { useMyStateUser } from '@/store/user-state';
import { useCancelBooking } from '@/hooks/mutations/useCancelBooking';
import { useCreateReview } from '@/hooks/mutations/useCreateReview';
import { useBooking } from '@/hooks/queries/useBooking';

type UserStoreState = ReturnType<typeof useMyStateUser.getState>;

function normalizePhone(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isMobileMoneyPayment(paymentMethod: PaymentMethod) {
  return (
    paymentMethod === PaymentMethod.mpesa ||
    paymentMethod === PaymentMethod.orange ||
    paymentMethod === PaymentMethod.airtel
  );
}

export default function BookingTripSummary() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams() as { id?: string | string[] };
  const bookingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t, tf, appLocale } = useI18n();
  const { s, font } = useLayoutScale();
  const toast = useAppToast();
  const analytics = useAnalytics();
  const storedUser = useMyStateUser((state: UserStoreState) => state.user);
  const queryClient = useQueryClient();
  const cancelBookingMutation = useCancelBooking();
  const createReviewMutation = useCreateReview();
  const {
    data: booking,
    isLoading: loading,
    isLoadingError,
  } = useBooking(bookingId, {
    clientId: storedUser?.id,
    pollingInterval: POLLING.critical,
  });

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    console.log('bookingId', bookingId);
    if (!isLoadingError) {
      
      return;
    }

    toast({
      title: t('common.error'),
      description: t('reservations.loadError'),
      action: 'error',
    });
  }, [isLoadingError, t, toast]);

  const closePaymentModal = (source: 'backdrop' | 'flow-exit' | 'completion' = 'backdrop') => {
    analytics.trackPaymentModalClosed({
      bookingId: booking?.id,
      reservationType: booking?.type,
      source,
    });
    setPaymentModalVisible(false);
  };

  const handlePay = () => {
    if (!booking) {
      return;
    }

    Keyboard.dismiss();
    analytics.trackPaymentModalOpened({
      bookingId: booking.id,
      reservationType: booking.type,
      totalPrice: booking.total ?? 0,
      carId: booking.carId ?? null,
      carName: booking.car?.name ?? null,
      hasGuest: Boolean(booking.guest?.fullName || booking.guest?.phone),
      hasComment: Boolean(booking.commentaire?.trim()),
    });
    setPaymentModalVisible(true);
  };

  const processPayment = async (
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
      const response: PawapayPaymentResponse = await pawapayPay({
        transaction_id: paymentRecord.transaction_id,
        amount: String(paymentRecord.amount),
        currency: paymentRecord.currency,
        paymentMethod: paymentRecord.paymentMethod,
        paymentNumber: paymentRecord.paymentNumber,
      });

      if (response.failureReason) {
        throw new Error(t('payment.failure.unknown'));
      }

      const status = response.status?.toUpperCase?.() ?? '';
      if (status && status !== 'COMPLETED' && status !== 'SUCCESS') {
        throw new Error(t('payment.failure.unknown'));
      }

      if (bookingId) {
        queryClient.setQueryData(
          queryKeys.booking.detail(bookingId),
          (current: Booking | undefined) => (current ? { ...current, isPaid: true } : current)
          
        );
      

        void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      }
      toast({
        title: t('reservations.payment.successTitle'),
        description: t('reservations.payment.successMessage'),
        action: 'success',
      });
      return;
    }

    if (paymentMethod === PaymentMethod.card) {
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
    }

    toast({
      title: t('reservations.payment.pendingTitle'),
      description: t('reservations.payment.pendingMessage'),
      action: 'warning',
    });
  };

  const handlePaymentSubmit = async (paymentMethod: PaymentMethod, phoneNumber?: string) => {
    if (!booking) {
      return;
    }

    if (isMobileMoneyPayment(paymentMethod) && !phoneNumber?.trim()) {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const clientId = session?.user?.id ?? booking.clientId;

      if (!clientId) {
        throw new Error(t('booking.sessionMissing'));
      }

      const resolvedClientPhone =
        normalizePhone(phoneNumber) ??
        normalizePhone(booking.clientPhone) ??
        normalizePhone(storedUser?.phone) ??
        '';

      const payload: CreateBookingInput = {
        id: booking.id,
        carId: booking.carId ?? '',
        clientId,
        clientPhone: resolvedClientPhone,
        currency: 'USD',
        departure: booking.departure,
        departureAt: booking.departureAt,
        arrival: booking.arrival ?? undefined,
        arrivalAt: booking.arrivalAt ?? undefined,
        type: booking.type,
        status: booking.status,
        originalTotal: booking.originalTotal ?? undefined,
        total: booking.total ?? 0,
        reference: booking.reference ?? undefined,
        taVolNumber: booking.taVolNumber ?? undefined,
        taReturn: booking.taReturn ?? undefined,
        taReturnAt: booking.taReturnAt ?? undefined,
        commentaire: booking.commentaire ?? undefined,
        couponCode: booking.couponCode ?? undefined,
        couponVehicleAmount: booking.couponVehicleAmount ?? undefined,
        guest: booking.guest ?? undefined,
        options: booking.options ?? undefined,
        paymentMethod,
        paymentProvider:
          paymentMethod === PaymentMethod.card
            ? PaymentProvider.card
            : paymentMethod === PaymentMethod.cash
              ? PaymentProvider.cash
              : PaymentProvider.mobileMoney,
        paymentNumber: normalizePhone(phoneNumber),
      };

      const bookingDetails = (await createNewBooking(payload)) as CreateBookingResponse;
      await processPayment(bookingDetails, paymentMethod);
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

  const handleCancel = () => {
    if (!booking) {
      return;
    }

    if (!canClientCancelBooking(booking)) {
      toast({
        title: t('common.error'),
        description: t('reservations.cancelRide'),
        action: 'error',
      });
      return;
    }

    Alert.alert(t('reservations.cancelRide'), t('reservations.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const clientId = user?.id ?? booking.clientId;
            if (!clientId) {
              throw new Error(t('booking.sessionMissing'));
            }

            await cancelBookingMutation.mutateAsync({
              bookingId: booking.id,
              status: booking.status,
              clientId,
            });
            toast({
              title: t('reservations.payment.successTitle'),
              description: t('reservations.cancelRide'),
              action: 'success',
            });
          } catch (error) {
            toast({
              title: t('common.error'),
              description: error instanceof Error ? error.message : t('common.error'),
              action: 'error',
            });
          }
        },
      },
    ]);
  };

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
    if (!booking?.id || !booking.driverId) {
      return;
    }

    setIsSubmittingReview(true);
    try {
      await createReviewMutation.mutateAsync({
        bookingId: booking.id,
        driverId: booking.driverId,
        ratingDriving,
        ratingPunctuality,
        ratingService,
        ratingVehicle,
        comment,
      });
      setReviewOpen(false);
      toast({
        title: t('reservations.reviewForm.successTitle'),
        description: t('reservations.reviewForm.successMessage'),
        action: 'success',
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error ? error.message : t('reservations.reviewForm.submitError'),
        action: 'error',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={buildStackScreenOptions({
          title: appLocale.toLowerCase().startsWith('fr') ? 'Ma réservation' : 'My booking',
          isDark,
          canGoBack: true,
          onBack: () => router.back(),
        })}
      />

      {loading ? (
        <LoadingView />
      ) : !booking ? (
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: isDark ? color.appDarkBackground : '#F7F7F8' }}>
          <View
            className="w-full rounded-2xl border px-4 py-5"
            style={{
              backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
              borderColor: isDark ? '#2F2F2F' : '#E5E7EB',
            }}>
            <View className="flex-row items-center gap-3">
              <View
                className="items-center justify-center rounded-full"
                style={{
                  backgroundColor: isDark ? '#3D241C' : '#FFE8DC',
                  width: s(44),
                  height: s(44),
                }}>
                <PackageOpen size={s(22)} color={color.primary} strokeWidth={2.2} />
              </View>
              <Text
                className="flex-1 font-semibold"
                style={{ color: isDark ? '#ffffff' : '#111827', fontSize: font.base }}>
                {t('booking.missingData')}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View
          className="flex-1"
          style={{ backgroundColor: isDark ? color.appDarkBackground : '#F7F7F8' }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}>
            <TripSummaryView
              booking={booking}
              isDark={isDark}
              isCancelling={cancelBookingMutation.isPending}
              onPay={handlePay}
              onCancel={handleCancel}
              onReview={() => setReviewOpen(true)}
              onBookAgain={() => router.push('/(tabs)')}
              t={t}
              tf={tf}
              appLocale={appLocale}
            />
          </ScrollView>
        </View>
      )}

      {isSubmittingPayment ? (
        <View className="absolute inset-0 items-center justify-center bg-black/35 px-6">
          <View
            className="w-full max-w-xs items-center rounded-2xl border px-5 py-6"
            style={{
              backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
              borderColor: isDark ? '#2F2F2F' : '#E5E7EB',
            }}>
            <ActivityIndicator size="large" color={color.primary} />
            <Text
              className="mt-3 text-center text-base font-semibold"
              style={{ color: isDark ? '#ffffff' : '#111827' }}>
              {t('booking.paymentProcessing')}
            </Text>
            <Text
              className="mt-1 text-center text-sm"
              style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {t('booking.paymentWaitingConfirmation')}
            </Text>
          </View>
        </View>
      ) : null}

      <PaymentModal
        visible={paymentModalVisible}
        isPremium={storedUser?.clientType === ClientType.PREMIUM}
        onClose={() => closePaymentModal('backdrop')}
        onSubmit={handlePaymentSubmit}
        submitting={isSubmittingPayment}
      />

      <ReviewBookingModal
        visible={reviewOpen}
        booking={booking ?? null}
        isDark={isDark}
        submitting={isSubmittingReview}
        onClose={() => !isSubmittingReview && setReviewOpen(false)}
        onSubmit={handleReviewSubmit}
        t={t}
      />
    </>
  );
}
