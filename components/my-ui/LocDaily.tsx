import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';

import { generateIDBooking, getAllBookings } from '@/api/booking';
import { getLocCars } from '@/api/car';
import { validateCoupon } from '@/api/coupon';
import {
  BookingOptionSectionCard,
  BookingOptionSectionHeader,
} from '@/components/my-ui/BookingOptionSectionCard';
import { BookingOptionToggleRow } from '@/components/my-ui/BookingOptionToggleRow';
import {
  BookingRecapDetailRow,
  BookingRecapDetailColumn,
} from '@/components/my-ui/BookingRecapDetail';
import { BookingRecapLayout } from '@/components/my-ui/BookingRecapLayout';
import { BookingRecapPriceSection } from '@/components/my-ui/BookingRecapPriceSection';
import { BookingRecapSection } from '@/components/my-ui/BookingRecapSection';
import { BookingRecapVehicleCard } from '@/components/my-ui/BookingRecapVehicleCard';
import { bookingSheetContentClassName } from '@/components/my-ui/BookingSheetLayout';
import { BookingTripSummaryCard } from '@/components/my-ui/BookingTripSummaryCard';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import { PromoCodeField } from '@/components/my-ui/PromoCodeField';
import { VehicleSelectionCard } from '@/components/my-ui/VehicleSelectionCard';
import { VehicleSelectionListLoader } from '@/components/my-ui/VehicleSelectionListLoader';
import { Button, ButtonText } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input, InputField } from '@/components/ui/input';
import { color } from '@/constants/colors';
import { EtapeReservation, ResStatus, ResType } from '@/constants/databaseEnum';
import {
  Booking,
  Car,
  CouponValidationValidResponse,
  LocationDocLOC,
} from '@/constants/dataInterface';
import { bookingSpacing, controlHeightStyle } from '@/constants/spacing';
import { useAnalytics } from '@/lib/analytics';
import { useFieldThemeColors } from '@/lib/field-theme';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const FIRST_BOOKING_PROMO_CODE = 'VSFMFE9Q';
const filledInputClassName = 'rounded-md border border-outline-100 bg-background-100';

const NEXT_ETAPE: Record<EtapeReservation, EtapeReservation> = {
  [EtapeReservation.SELECTION]: EtapeReservation.OPTION,
  [EtapeReservation.OPTION]: EtapeReservation.RECAP,
  [EtapeReservation.RECAP]: EtapeReservation.RECAP,
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function formatDailyRange(
  locationDoc: LocationDocLOC,
  locale: string,
  daySingular: string,
  dayPlural: string,
  unavailableLabel: string
) {
  const startDate = toDate(locationDoc.dateStart);
  const endDate = toDate(locationDoc.dateEnd);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return unavailableLabel;
  }

  const formattedStart = startDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
  const formattedEnd = endDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const diffInMs = endDate.getTime() - startDate.getTime();
  const diffInDays = Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
  const dayLabel = diffInDays > 1 ? dayPlural : daySingular;

  return `${formattedStart} - ${formattedEnd} (${diffInDays} ${dayLabel})`;
}

function getRentalDays(locationDoc: LocationDocLOC) {
  const startDate = toDate(locationDoc.dateStart);
  const endDate = toDate(locationDoc.dateEnd);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 1;
  }

  const diffInMs = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
}

function getFuelOptionPrice(car: Car | null) {
  const fuelOption = car?.priceOptions?.find((option: { name?: string; price?: unknown }) => {
    const optionName = option?.name?.toLowerCase() ?? '';
    return optionName.includes('carburant') || optionName.includes('fuel');
  });

  return typeof fuelOption?.price === 'number' ? fuelOption.price : null;
}

function getExtraTimePrice(value: unknown) {
  return typeof value === 'number' ? value : null;
}

function getDailyServiceEndDate(locationDoc: LocationDocLOC, flex: boolean, premium: boolean) {
  const endDate = toDate(locationDoc.dateEnd);

  if (Number.isNaN(endDate.getTime())) {
    return endDate;
  }

  if (premium) {
    const premiumEndDate = new Date(endDate);
    premiumEndDate.setHours(5, 30, 0, 0);

    if (premiumEndDate.getTime() <= endDate.getTime()) {
      premiumEndDate.setDate(premiumEndDate.getDate() + 1);
    }

    return premiumEndDate;
  }

  if (flex) {
    const flexEndDate = new Date(endDate);
    flexEndDate.setHours(23, 30, 0, 0);

    if (flexEndDate.getTime() <= endDate.getTime()) {
      flexEndDate.setDate(flexEndDate.getDate() + 1);
    }

    return flexEndDate;
  }

  return endDate;
}

function formatBookingDateTime(value: Date | string, locale: string, unavailableLabel: string) {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return unavailableLabel;
  }

  const dateLabel = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const timeLabel = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateLabel} · ${timeLabel}`;
}

function normalizeGuestPhone(phoneNumber: string | null | undefined) {
  if (!phoneNumber) {
    return '';
  }

  const digits = phoneNumber.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('243') && digits.length >= 12) {
    return digits.slice(3, 12);
  }

  if (digits.startsWith('0') && digits.length >= 10) {
    return digits.slice(1, 10);
  }

  if (digits.length > 9) {
    return digits.slice(-9);
  }

  return digits;
}

function toLocationPoint(locationDoc: LocationDocLOC) {
  return {
    label: locationDoc.location.description,
    lat: locationDoc.location.lat,
    lng: locationDoc.location.lng,
  };
}

/** Extract discount amount from valid coupon response */
function extractDiscountAmount(coupon: CouponValidationValidResponse | null): number {
  if (!coupon) return 0;
  if (typeof coupon.discountAmount === 'number') return coupon.discountAmount;
  if (typeof coupon.finalAmount === 'number' && typeof coupon.originalAmount === 'number') {
    return Math.max(0, coupon.originalAmount - coupon.finalAmount);
  }
  return 0;
}

/** Calculate total after discount */
function calculateFinalTotal(baseTotal: number, discountAmount: number): number {
  return Math.max(0, baseTotal - discountAmount);
}

type Props = {
  locationDoc: LocationDocLOC;
  isDarkMode: boolean;
  onSubmit: (doc: Booking) => void;
  etape: EtapeReservation;
  setEtape: (etape: EtapeReservation) => void;
};

export function LocDaily({ locationDoc, isDarkMode, onSubmit, etape, setEtape }: Props) {
  void isDarkMode;

  const theme = isDarkMode ? dark : light;
  const { appLocale, t } = useI18n();
  const toast = useAppToast();
  const fieldThemeColors = useFieldThemeColors();
  const emptyCarsTitleKey = 'booking.dailyCars.empty.title';
  const emptyCarsDescriptionKey = 'booking.dailyCars.empty.description';
  const dateRangeLabel = formatDailyRange(
    locationDoc,
    appLocale,
    t('booking.daySingular'),
    t('booking.dayPlural'),
    t('booking.dailyDatesUnavailable')
  );
  const rentalDays = getRentalDays(locationDoc);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingCars, setIsLoadingCars] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const analytics = useAnalytics();
  const [fuel, setFuel] = useState(false);
  const [flex, setFlex] = useState(false);
  const [premium, setPremium] = useState(false);
  const [code, setCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [validatedCoupon, setValidatedCoupon] = useState<CouponValidationValidResponse | null>(
    null
  );
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isGuestSectionOpen, setIsGuestSectionOpen] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingCreatedAt, setBookingCreatedAt] = useState<string | null>(null);
  const bookingIdRequestRef = useRef<Promise<string> | null>(null);
  const autoPromoAttemptedRef = useRef(false);
  const fuelPrice = getFuelOptionPrice(selectedCar);
  const flexPrice = getExtraTimePrice(selectedCar?.extraTime?.flex);
  const premiumPrice = getExtraTimePrice(selectedCar?.extraTime?.premium);
  const hasFuelOption = fuelPrice !== null;
  const hasFlexOption = flexPrice !== null;
  const hasPremiumOption = premiumPrice !== null;
  const hasAnyOption = hasFuelOption || hasFlexOption || hasPremiumOption;
  const baseVehicleAmount = (selectedCar?.priceLOC ?? 0) * rentalDays;
  // Coupon discount is fixed once validated; invalidates when options change via useEffect
  const couponDiscountAmount = extractDiscountAmount(validatedCoupon);
  const finalTotalPrice = calculateFinalTotal(totalPrice, couponDiscountAmount);

  const getOrCreateBookingId = async () => {
    if (bookingId) {
      return bookingId;
    }

    if (!bookingIdRequestRef.current) {
      bookingIdRequestRef.current = generateIDBooking(ResType.LOC)
        .then((generatedBookingId) => {
          if (typeof generatedBookingId !== 'string' || !generatedBookingId) {
            throw new Error(t('booking.generationImpossible'));
          }

          setBookingId(generatedBookingId);
          setBookingCreatedAt((currentValue) => currentValue ?? new Date().toISOString());
          return generatedBookingId;
        })
        .finally(() => {
          bookingIdRequestRef.current = null;
        });
    }

    return bookingIdRequestRef.current;
  };

  const buildBooking = async (): Promise<Booking | null> => {
    if (!selectedCar) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const resolvedBookingId = await getOrCreateBookingId();
    const serviceEndDate = getDailyServiceEndDate(locationDoc, flex, premium);
    const originalTotal = totalPrice;
    const finalTotal = finalTotalPrice;

    const selectedOptions = {
      fuel: fuel ? (fuelPrice ?? 0) : 0,
      flex: flex ? (flexPrice ?? 0) : 0,
      premium: premium ? (premiumPrice ?? 0) : 0,
      couponCode: appliedCouponCode,
      couponDiscountAmount: couponDiscountAmount,
      rentalDays,
    };
    const trimmedComment = comment.trim();
    const trimmedGuestName = guestName.trim();
    const trimmedGuestPhone = guestPhone.trim();

    return {
      id: resolvedBookingId,
      type: ResType.LOC,
      status: ResStatus.PENDING,
      carId: selectedCar.id,
      clientId: null,
      clientPhone: trimmedGuestPhone || null,
      driverId: selectedCar.defaultDriverId,
      departureAt: toDate(locationDoc.dateStart).toISOString(),
      arrivalAt: serviceEndDate.toISOString(),
      departure: toLocationPoint(locationDoc),
      arrival: null,
      commentaire: trimmedComment || null,
      isPaid: false,
      couponCode: appliedCouponCode ?? undefined,
      couponVehicleAmount: baseVehicleAmount,
      originalTotal: appliedCouponCode ? originalTotal : undefined,
      total: finalTotal,
      options: selectedOptions,
      guest:
        trimmedGuestName || trimmedGuestPhone
          ? {
              fullName: trimmedGuestName || null,
              phone: trimmedGuestPhone || null,
            }
          : null,
      name: trimmedGuestName || null,
      reference: null,
      taVolNumber: null,
      taReturn: false,
      taReturnAt: null,
      rideStartAt: null,
      rideEndAt: null,
      cancelAt: null,
      cancelReason: null,
      createAt: bookingCreatedAt ?? nowIso,
      updateAt: nowIso,
      car: {
        name: selectedCar.name,
        registrationId: selectedCar.registrationId,
        images: selectedCar.images,
        category: selectedCar.category ? { ...selectedCar.category } : null,
      },
      client: null,
      driver: selectedCar.defaultDriver,
      coupon: null,
      review: null,
    };
  };

  useEffect(() => {
    const carBasePrice = selectedCar?.priceLOC ?? 0;
    const selectedOptionsTotal =
      (fuel ? (fuelPrice ?? 0) : 0) +
      (flex ? (flexPrice ?? 0) : 0) +
      (premium ? (premiumPrice ?? 0) : 0);

    setTotalPrice((carBasePrice + selectedOptionsTotal) * rentalDays);
  }, [selectedCar, fuel, fuelPrice, flex, flexPrice, premium, premiumPrice, rentalDays]);

  // Invalidate coupon when options or vehicle change
  useEffect(() => {
    if (appliedCouponCode !== null) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [selectedCar?.id, fuel, flex, premium, rentalDays]);

  // Clear promo feedback if user manually edits code
  useEffect(() => {
    if (appliedCouponCode && code.trim() !== appliedCouponCode) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [code]);

  // Reset auto-promo attempt flag when etape or vehicle changes
  useEffect(() => {
    autoPromoAttemptedRef.current = false;
  }, [etape, selectedCar?.id]);

  const loadCars = async (nextPage: number, replace = false) => {
    if (isLoadingCars) {
      return;
    }

    setIsLoadingCars(true);

    try {
      const res = await getLocCars({
        page: nextPage,
        startDate: locationDoc.dateStart,
        endDate: locationDoc.dateEnd,
      });
      const nextCars = Array.isArray(res) ? res : [];

      setCars((currentCars) => (replace ? nextCars : [...currentCars, ...nextCars]));
      setPage(nextPage);
      setHasMore(nextCars.length > 0);
    } finally {
      setIsLoadingCars(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (etape === EtapeReservation.SELECTION) {
      setCars([]);
      setPage(1);
      setHasMore(true);
      void loadCars(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload vehicles when step changes
  }, [etape]);

  useEffect(() => {
    return () => {
      setEtape(EtapeReservation.SELECTION);
    };
  }, [setEtape]);

  const handleNextEtape = async () => {
    if (etape === EtapeReservation.RECAP) {
      try {
        const booking = await buildBooking();

        if (!booking) {
          toast({
            title: t('common.information'),
            description: t('booking.selectVehicleBeforeConfirm'),
            action: 'info',
          });
          return;
        }

        onSubmit(booking);
      } catch (error) {
        toast({
          title: t('common.error'),
          description: error instanceof Error ? error.message : t('booking.generationImpossible'),
          action: 'error',
        });
      }

      return;
    }

    setEtape(NEXT_ETAPE[etape]);

    if (etape === EtapeReservation.OPTION && selectedCar) {
      const extraOptions: string[] = [];
      if (flex) extraOptions.push('flex');
      if (premium) extraOptions.push('premium');
      analytics.trackVehicleOptionsChosen(selectedCar.id, {
        withFuel: fuel,
        withDriver: !!selectedCar.defaultDriverId,
        extraOptions,
        totalPrice,
      });
    }
  };

  const actionLabel =
    etape === EtapeReservation.RECAP ? t('booking.confirmAndPay') : t('booking.continue');

  const handleCarPress = (car: Car) => {
    setSelectedCar(car);
    analytics.trackVehicleSelected(car.id, {
      carName: car.name,
      category: car.category?.name ?? null,
      seats: car.seats,
      fuel: car.fuel,
      price: car.priceLOC,
      reservationType: ResType.LOC,
    });
    handleNextEtape();
  };

  const handleLoadMore = () => {
    if (etape !== EtapeReservation.SELECTION || !hasMore || isLoadingCars) {
      return;
    }

    void loadCars(page + 1);
  };

  const handleRefresh = () => {
    if (isLoadingCars) {
      return;
    }

    setIsRefreshing(true);
    setHasMore(true);
    void loadCars(1, true);
  };

  const handleFuelInfoPress = () => {
    toast({
      title: t('common.information'),
      description: t('booking.fuelInfo'),
      action: 'info',
    });
  };

  const handleFlexChange = (value: boolean) => {
    setFlex(value);
    if (value) {
      setPremium(false);
    }
  };

  const handlePremiumChange = (value: boolean) => {
    setPremium(value);
    if (value) {
      setFlex(false);
    }
  };

  const handlePickGuestFromContacts = async () => {
    if (Platform.OS === 'web') {
      toast({
        title: t('common.information'),
        description: t('booking.contactImportUnsupported'),
        action: 'info',
      });
      return;
    }

    try {
      const { status: existingStatus } = await Contacts.getPermissionsAsync();
      const finalStatus =
        existingStatus === 'granted'
          ? existingStatus
          : (await Contacts.requestPermissionsAsync()).status;

      if (finalStatus !== 'granted') {
        toast({
          title: t('common.error'),
          description: t('booking.contactImportPermissionDenied'),
          action: 'error',
        });
        return;
      }

      const selectedContact = await Contacts.presentContactPickerAsync();

      if (!selectedContact) {
        return;
      }

      const contactName =
        selectedContact.name?.trim() ||
        [selectedContact.firstName, selectedContact.lastName].filter(Boolean).join(' ').trim();
      const phoneValue = normalizeGuestPhone(selectedContact.phoneNumbers?.[0]?.number);

      if (contactName) {
        setGuestName(contactName);
      }

      if (phoneValue) {
        setGuestPhone(phoneValue);
        return;
      }

      toast({
        title: t('common.information'),
        description: t('booking.contactImportPhoneMissing'),
        action: 'info',
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error && error.message
            ? error.message
            : t('booking.contactImportFailed'),
        action: 'error',
      });
    }
  };

  const handleApplyPromoCode = async (promoCodeOverride?: string, isFirstBooking?: boolean) => {
    const normalizedCode = (promoCodeOverride ?? code).trim();

    // Validate input
    if (!normalizedCode) {
      setPromoFeedback({ tone: 'error', message: t('booking.promoCodeRequired') });
      return;
    }

    if (!selectedCar?.id || totalPrice <= 0 || baseVehicleAmount <= 0) {
      setPromoFeedback({ tone: 'error', message: t('booking.promoCodeUnavailable') });
      return;
    }

    setIsApplyingPromo(true);
    // Only update code if not from override (auto-promo uses override)
    if (!promoCodeOverride) {
      setCode(normalizedCode);
    }

    try {
      const response = await validateCoupon({
        code: normalizedCode,
        carId: selectedCar.id,
        bookingType: 'LOC',
        vehicleAmount: baseVehicleAmount,
        orderTotal: totalPrice,
      });

      if (response.valid) {
        // Build success message with fallback
        let successMessage: string = t('booking.promoCodeApplied') as string;
        if (typeof response.message === 'string' && response.message.trim()) {
          successMessage = response.message as string;
        } else if (normalizedCode === FIRST_BOOKING_PROMO_CODE) {
          successMessage = t('booking.promoCodeWelcomeApplied') as string;
        }

        // Apply coupon
        setValidatedCoupon(response);
        setAppliedCouponCode(normalizedCode);
        setPromoFeedback({
          tone: 'success',
          message: successMessage,
        });
        return;
      }

      // Coupon not valid
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      if (!isFirstBooking) {
        setPromoFeedback({
          tone: 'error',
          message: t('booking.promoCodeInvalid'),
        });
      }
    } catch (error) {
      // API error
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback({
        tone: 'error',
        message:
          error instanceof Error && error.message ? error.message : t('booking.promoCodeInvalid'),
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Auto-apply welcome promo only once per recap session if eligible
  useEffect(() => {
    // Guard: only run on recap step
    if (etape !== EtapeReservation.RECAP) {
      return;
    }

    // Guard: booking data must be valid
    if (!selectedCar?.id || totalPrice <= 0 || baseVehicleAmount <= 0) {
      return;
    }

    // Guard: already attempted or already applied
    if (autoPromoAttemptedRef.current || appliedCouponCode === FIRST_BOOKING_PROMO_CODE) {
      return;
    }

    // Guard: user has manually entered a code
    if (code.trim() && code.trim() !== FIRST_BOOKING_PROMO_CODE) {
      return;
    }

    autoPromoAttemptedRef.current = true;
    let isMounted = true;

    const tryApplyWelcomePromo = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const bookings = await getAllBookings(user.id);
        if (!isMounted || !Array.isArray(bookings) || bookings.length > 0) return;

        // User is eligible: auto-apply welcome code silently
        await handleApplyPromoCode(FIRST_BOOKING_PROMO_CODE, true);
      } catch {
        // Fail silently - user can still manually apply promo
      }
    };

    void tryApplyWelcomePromo();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when entering recap
  }, [etape, selectedCar?.id]);

  const selectCarsPage = () => {
    const categoryUnavailableLabel = t('booking.categoryUnavailable');
    const priceUnit = `$${t('booking.perDay')}`;

    return (
      <View
        style={[
          { backgroundColor: theme.bg },
          etape === EtapeReservation.SELECTION ? { flex: 1 } : {},
        ]}>
        <FlatList
          data={cars}
          keyExtractor={(car) => car.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: bookingSpacing.screenPaddingX,
            paddingTop: bookingSpacing.sectionGap,
            paddingBottom: bookingSpacing.scrollPaddingBottom,
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <BookingTripSummaryCard onEditPress={() => router.back()}>
              <Text className="text-base font-medium text-typography-900" numberOfLines={1}>
                {locationDoc.location.description ?? t('booking.departure')}
              </Text>
              <Text className="mt-1 text-sm text-typography-500" numberOfLines={1}>
                {dateRangeLabel}
              </Text>
            </BookingTripSummaryCard>
          }
          ListFooterComponent={
            isLoadingCars && !isRefreshing && cars.length > 0 ? (
              <VehicleSelectionListLoader compact />
            ) : null
          }
          ListEmptyComponent={
            isLoadingCars && cars.length === 0 ? (
              <VehicleSelectionListLoader />
            ) : !isLoadingCars ? (
              <ErrorEmpty
                isDark={isDarkMode}
                title={t(emptyCarsTitleKey)}
                description={t(emptyCarsDescriptionKey)}
              />
            ) : null
          }
          renderItem={({ item: car }) => (
            <VehicleSelectionCard
              car={car}
              isSelected={selectedCar?.id === car.id}
              categoryUnavailableLabel={categoryUnavailableLabel}
              priceAmount={String(car.priceLOC)}
              priceUnit={priceUnit}
              onPress={handleCarPress}
            />
          )}
        />
      </View>
    );
  };

  const selectOption = () => {
    const optionFooter = (
      <View style={{ paddingHorizontal: bookingSpacing.screenPaddingX }}>
        <Button
          action="primary"
          variant="solid"
          size="control"
          className="w-full rounded-2xl"
          style={controlHeightStyle}
          onPress={handleNextEtape}>
          <ButtonText className="text-white">{actionLabel}</ButtonText>
        </Button>
      </View>
    );

    return (
      <View
        style={[
          { backgroundColor: theme.bg },
          etape === EtapeReservation.OPTION ? { flex: 1 } : {},
        ]}>
        <BookingRecapLayout footer={optionFooter}>
          <View
            style={{
              paddingHorizontal: bookingSpacing.screenPaddingX,
              paddingTop: bookingSpacing.sectionGap,
            }}>
            <BookingTripSummaryCard onEditPress={() => router.back()}>
              <Text className="text-base font-medium text-typography-900" numberOfLines={1}>
                {locationDoc.location.description ?? t('booking.departure')}
              </Text>
              <Text className="mt-1 text-sm text-typography-500" numberOfLines={1}>
                {dateRangeLabel}
              </Text>
            </BookingTripSummaryCard>

            {hasAnyOption ? (
              <BookingOptionSectionCard title={t('booking.optionsTitle')}>
                {hasFuelOption ? (
                  <BookingOptionToggleRow
                    title={t('booking.fuelFees')}
                    description={t('booking.fuelFeesDescription')}
                    priceLabel={`${fuelPrice} $`}
                    checked={fuel}
                    onCheckedChange={setFuel}
                    onInfoPress={handleFuelInfoPress}
                  />
                ) : null}

                {hasFlexOption ? (
                  <BookingOptionToggleRow
                    title={t('booking.flexExtraHours')}
                    description={t('booking.flexExtraHoursDescription')}
                    priceLabel={`${flexPrice} $`}
                    checked={flex}
                    onCheckedChange={handleFlexChange}
                    showDivider={hasFuelOption}
                  />
                ) : null}

                {hasPremiumOption ? (
                  <BookingOptionToggleRow
                    title={t('booking.premiumExtraHours')}
                    description={t('booking.premiumExtraHoursDescription')}
                    priceLabel={`${premiumPrice} $`}
                    checked={premium}
                    onCheckedChange={handlePremiumChange}
                    showDivider={hasFuelOption || hasFlexOption}
                  />
                ) : null}
              </BookingOptionSectionCard>
            ) : null}

            <BookingOptionSectionCard title={t('booking.commentOptional')}>
              <Input variant="outline" size="control" className={filledInputClassName}>
                <InputField
                  placeholder={t('booking.commentPlaceholder')}
                  placeholderTextColor={fieldThemeColors.placeholder}
                  multiline
                  value={comment}
                  onChangeText={setComment}
                />
              </Input>
            </BookingOptionSectionCard>

            <Collapsible open={isGuestSectionOpen} onOpenChange={setIsGuestSectionOpen}>
              <BookingOptionSectionCard
                header={
                  <CollapsibleTrigger asChild>
                    <Pressable accessibilityRole="button" className="active:opacity-80">
                      <BookingOptionSectionHeader
                        title={t('booking.bookForOtherPersonOptional')}
                        right={
                          <Ionicons
                            name={isGuestSectionOpen ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={fieldThemeColors.listItemSubText}
                          />
                        }
                      />
                    </Pressable>
                  </CollapsibleTrigger>
                }>
                <CollapsibleContent>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void handlePickGuestFromContacts()}
                    className="mb-3 flex-row items-center rounded-md border border-outline-100  px-3 py-3 active:opacity-80">
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={fieldThemeColors.listItemText}
                    />
                    <Text className="ml-2 text-sm font-medium text-typography-900">
                      {t('booking.importFromContacts')}
                    </Text>
                  </Pressable>

                  <Input variant="outline" size="control" className={filledInputClassName}>
                    <InputField
                      placeholder={t('booking.fullName')}
                      placeholderTextColor={fieldThemeColors.placeholder}
                      value={guestName}
                      onChangeText={setGuestName}
                    />
                  </Input>

                  <Input
                    variant="outline"
                    size="control"
                    className={`${filledInputClassName} mt-3`}>
                    <InputField
                      placeholder={t('booking.phoneNumber')}
                      placeholderTextColor={fieldThemeColors.placeholder}
                      value={guestPhone}
                      onChangeText={setGuestPhone}
                      keyboardType="phone-pad"
                    />
                  </Input>
                </CollapsibleContent>
              </BookingOptionSectionCard>
            </Collapsible>
          </View>
        </BookingRecapLayout>
      </View>
    );
  };

  const recap = () => {
    const recapImage = selectedCar?.images[0] ?? 'https://via.placeholder.com/400x240';
    const trimmedComment = comment.trim();
    const trimmedGuestName = guestName.trim();
    const trimmedGuestPhone = guestPhone.trim();
    const serviceEndDate = getDailyServiceEndDate(locationDoc, flex, premium);
    const selectedOptions = [
      fuel && fuelPrice !== null ? t('booking.fuelIncluded') : null,
      flex && flexPrice !== null ? t('booking.flexHoursSummary') : null,
      premium && premiumPrice !== null ? t('booking.premiumHoursSummary') : null,
    ].filter(Boolean) as string[];
    const startDateLabel = formatBookingDateTime(
      locationDoc.dateStart,
      appLocale,
      t('booking.dailyDatesUnavailable')
    );
    const endDateLabel = formatBookingDateTime(
      serviceEndDate,
      appLocale,
      t('booking.dailyDatesUnavailable')
    );
    const serviceHoursSummary = premium
      ? t('booking.premiumHoursSummary')
      : flex
        ? t('booking.flexHoursSummary')
        : t('booking.serviceHoursSummary');
    const hasSecondaryDetails =
      selectedOptions.length > 0 ||
      Boolean(trimmedComment) ||
      Boolean(trimmedGuestName) ||
      Boolean(trimmedGuestPhone);
    const priceLines = [
      {
        label: `${rentalDays} ${rentalDays > 1 ? t('booking.dayPlural') : t('booking.daySingular')} ${t('booking.rentalDaysPrice')} x ${selectedCar?.priceLOC ?? 0} $`,
        value: `${(selectedCar?.priceLOC ?? 0) * rentalDays} $`,
      },
      ...(fuel && fuelPrice !== null
        ? [
            {
              label: t('booking.fuelFees'),
              value: `${fuelPrice * rentalDays} $`,
            },
          ]
        : []),
      ...(flex && flexPrice !== null
        ? [
            {
              label: t('booking.flexExtraHours'),
              value: `${flexPrice * rentalDays} $`,
            },
          ]
        : []),
      ...(premium && premiumPrice !== null
        ? [
            {
              label: t('booking.premiumExtraHours'),
              value: `${premiumPrice * rentalDays} $`,
            },
          ]
        : []),
      ...(couponDiscountAmount > 0
        ? [
            {
              label: t('booking.discount'),
              value: `- ${couponDiscountAmount} $`,
            },
          ]
        : []),
    ];

    const recapFooter = (
      <Button
        action="primary"
        variant="solid"
        size="control"
        className="w-full rounded-2xl"
        style={controlHeightStyle}
        onPress={handleNextEtape}>
        <ButtonText className="text-white">{actionLabel}</ButtonText>
      </Button>
    );

    return (
      <BookingRecapLayout footer={recapFooter}>
        <BookingRecapVehicleCard
          imageUri={recapImage}
          name={selectedCar?.name ?? t('booking.noVehicle')}
          category={selectedCar?.category?.name ?? t('booking.categoryUnavailable')}
          seats={selectedCar?.seats ?? 0}
          baggage={selectedCar?.baggage ?? 0}
          priceAmount={`${selectedCar?.priceLOC ?? 0} $`}
          priceUnit={t('booking.perDay')}
        />

        <BookingRecapSection title={t('booking.detailsTitle')}>
          <BookingRecapDetailColumn
            label={t('booking.address')}
            value={locationDoc.location.description ?? t('booking.addressUnavailable')}
          />
          <BookingRecapDetailColumn label={t('booking.startDateTime')} value={startDateLabel} />
          <BookingRecapDetailColumn label={t('booking.endDateTime')} value={endDateLabel} />

          <View className="my-3 border-t border-outline-100" />

          <Text className="mt-1 text-sm text-typography-500">- {t('booking.driverIncluded')}</Text>

          {fuel && fuelPrice !== null ? null : (
            <Text className="mt-1 text-sm text-typography-500">
              - {t('booking.fuelAtClientExpense')}
            </Text>
          )}

          <Text className="mt-1 text-sm text-typography-500">
            - {t('booking.dailyCancellationSummary')}
          </Text>
          <Text className="mt-1 text-sm text-typography-500">
            - {t('booking.city')}: {t('booking.kinshasa')}
          </Text>
        </BookingRecapSection>

        {hasSecondaryDetails ? (
          <BookingRecapSection title={t('booking.optionsTitle')}>
            {selectedOptions.length > 0 ? (
              <Text className="text-sm text-typography-500">- {selectedOptions.join('\n- ')}</Text>
            ) : null}
            {trimmedComment ? (
              <View className="my-3 " >                
                <Text className="text-typography-900 mb-4 text-base font-bold">{t('booking.comment')}</Text> 
                 <Text className="text-sm text-typography-500">- {trimmedComment}</Text>
              </View>
            ) : null}
            {trimmedGuestName || trimmedGuestPhone ? (

               <View className="my-3 " >                
                <Text className="text-typography-900 mb-4 text-base font-bold">{t('booking.bookingFor')}</Text> 
                 <Text className="text-sm text-typography-500">- {[trimmedGuestName, trimmedGuestPhone].filter(Boolean).join(' · ')}</Text>
              </View>
              
            ) : null}
          </BookingRecapSection>
        ) : null}

        <PromoCodeField
          label={t('booking.promoCodeLabel')}
          placeholder={t('booking.promoCodePlaceholder')}
          actionLabel={t('booking.applyPromoCode')}
          value={code}
          onChangeText={setCode}
          onApply={() => void handleApplyPromoCode()}
          textColor={theme.text}
          subTextColor={theme.subText}
          borderColor={theme.border}
          inputBackgroundColor={theme.input}
          titleSize={16}
          isApplying={isApplyingPromo}
          feedbackMessage={promoFeedback?.message ?? null}
          feedbackTone={promoFeedback?.tone ?? 'default'}
        />

        <BookingRecapPriceSection
          title={t('booking.totalTitle')}
          lines={priceLines}
          totalLabel={t('booking.total')}
          totalValue={`${finalTotalPrice} $`}
        />
      </BookingRecapLayout>
    );
  };

  const isSheetStep = etape === EtapeReservation.SELECTION || etape === EtapeReservation.OPTION;

  return (
    <View
      className="flex-1"
      style={
        isSheetStep
          ? undefined
          : { paddingHorizontal: bookingSpacing.screenPaddingX, paddingTop: 16 }
      }>
      {etape === EtapeReservation.SELECTION && selectCarsPage()}

      {etape === EtapeReservation.OPTION && selectOption()}
      {etape === EtapeReservation.RECAP && recap()}
    </View>
  );
}

const light = {
  bg: '#ffffff',
  card: '#f3f4f6',
  text: '#14181B',
  subText: '#6b6b6b',
  border: '#d1d5db',
  input: '#ffffff',
};

const dark = {
  bg: color.appDarkBackground,
  card: '#1E2226',
  text: '#FFFFFF',
  subText: '#A0A0A0',
  border: '#374151',
  input: '#111827',
};
