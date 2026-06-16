import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';

import { calculateDistance, generateIDBooking, getAllBookings } from '@/api/booking';
import { getTaCars } from '@/api/car';
import { validateCoupon } from '@/api/coupon';
import {
  BookingOptionSectionCard,
  BookingOptionSectionHeader,
} from '@/components/my-ui/BookingOptionSectionCard';
import { BookingRecapDetailRow, BookingRecapDetailColumn } from '@/components/my-ui/BookingRecapDetail';
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
  LocationDocTA,
} from '@/constants/dataInterface';
import { bookingSpacing, controlHeightStyle } from '@/constants/spacing';
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

type Props = {
  locationDoc: LocationDocTA;
  isDarkMode: boolean;
  onSubmit: (doc: Booking) => void;
  etape: EtapeReservation;
  setEtape: (etape: EtapeReservation) => void;
};

function toDate(value: Date | string | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function formatAirportSchedule(
  locationDoc: LocationDocTA,
  locale: string,
  unavailableLabel: string
) {
  const startDate = toDate(locationDoc.dateStart);
  const returnDate = toDate(locationDoc.dateReturn);

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return unavailableLabel;
  }

  const startLabel = startDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const startTimeLabel = startDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (locationDoc.tripType === 'round-trip' && returnDate && !Number.isNaN(returnDate.getTime())) {
    const returnLabel = returnDate.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
    const returnTimeLabel = returnDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${startLabel} ${startTimeLabel} - ${returnLabel} ${returnTimeLabel}`;
  }

  return `${startLabel} ${startTimeLabel}`;
}

function toLocationPoint(
  location: LocationDocTA['locationDepart'] | LocationDocTA['locationDest']
) {
  return {
    label: location.description,
    lat: location.lat,
    lng: location.lng,
  };
}

function getNumericValue(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function getAirportTripPrice(car: Car | null, distanceKm: number | null) {
  if (!car) {
    return 0;
  }

  const taMin = getNumericValue(car.priceTA?.min);
  const taPrice = getNumericValue(car.priceTA?.price);

  if (distanceKm === null || distanceKm < 30) {
    return taMin;
  }

  return Number((distanceKm * taPrice).toFixed(2));
}

function getCouponDiscountAmount(
  coupon: CouponValidationValidResponse | null,
  _orderTotal: number
) {
  if (!coupon) {
    return 0;
  }

  if (typeof coupon.discountAmount === 'number') {
    return coupon.discountAmount;
  }

  if (typeof coupon.originalAmount === 'number' && typeof coupon.finalAmount === 'number') {
    return Math.max(0, coupon.originalAmount - coupon.finalAmount);
  }

  return 0;
}

function getCouponFinalTotal(coupon: CouponValidationValidResponse | null, orderTotal: number) {
  if (coupon && typeof coupon.finalAmount === 'number') {
    return coupon.finalAmount;
  }

  return Math.max(0, orderTotal - getCouponDiscountAmount(coupon, orderTotal));
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

export function LocAirport({ locationDoc, isDarkMode, onSubmit, etape, setEtape }: Props) {
  const theme = isDarkMode ? dark : light;
  const router = useRouter();
  const { appLocale, t } = useI18n();
  const toast = useAppToast();
  const fieldThemeColors = useFieldThemeColors();
  const emptyCarsTitleKey = 'booking.noVehicleAvailable';
  const emptyCarsDescriptionKey = 'booking.dailyCars.empty.description';
  const scheduleLabel = formatAirportSchedule(
    locationDoc,
    appLocale,
    t('booking.airportDateUnavailable')
  );
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingCars, setIsLoadingCars] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
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
  const [flyNumber, setFlyNumber] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isGuestSectionOpen, setIsGuestSectionOpen] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingCreatedAt, setBookingCreatedAt] = useState<string | null>(null);
  const [isPositionAller, setPositionAller] = useState(true);
  const bookingIdRequestRef = useRef<Promise<string> | null>(null);
  const autoPromoAttemptedRef = useRef(false);
  const tripPrice = getAirportTripPrice(selectedCar, distanceKm);
  const totalPrice = tripPrice * (locationDoc.tripType === 'round-trip' ? 2 : 1);
  const baseVehicleAmount = totalPrice;
  const promoDiscountAmount = getCouponDiscountAmount(validatedCoupon, totalPrice);
  const finalTotalPrice = getCouponFinalTotal(validatedCoupon, totalPrice);

  const getOrCreateBookingId = async () => {
    if (bookingId) {
      return bookingId;
    }

    if (!bookingIdRequestRef.current) {
      bookingIdRequestRef.current = generateIDBooking(ResType.TA)
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

  const buildBooking = async (car?: Car): Promise<Booking | null> => {
    const resolvedCar = car ?? selectedCar;
    if (!resolvedCar) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const resolvedBookingId = await getOrCreateBookingId();
    const trimmedFlyNumber = flyNumber.trim();
    const trimmedGuestPhone = guestPhone.trim();
    const resolvedTripPrice = getAirportTripPrice(resolvedCar, distanceKm);
    const resolvedTotalPrice = resolvedTripPrice * (locationDoc.tripType === 'round-trip' ? 2 : 1);
    const resolvedDiscountAmount = resolvedCar.id === selectedCar?.id ? promoDiscountAmount : 0;
    const resolvedFinalTotal =
      resolvedCar.id === selectedCar?.id ? finalTotalPrice : resolvedTotalPrice;

    return {
      id: resolvedBookingId,
      type: ResType.TA,
      status: ResStatus.PENDING,
      carId: resolvedCar.id,
      clientId: null,
      clientPhone: null,
      driverId: resolvedCar.defaultDriverId,
      departureAt: toDate(locationDoc.dateStart)?.toISOString() ?? nowIso,
      arrivalAt: toDate(locationDoc.dateReturn)?.toISOString() ?? null,
      departure: toLocationPoint(locationDoc.locationDepart),
      arrival: toLocationPoint(locationDoc.locationDest),
      commentaire: comment || null,
      couponCode: appliedCouponCode,
      isPaid: false,
      total: resolvedFinalTotal,
      options: {
        tripType: locationDoc.tripType,
        priceTA: resolvedCar.priceTA,
        distanceKm,
        couponDiscountAmount: resolvedDiscountAmount,
      },
      guest:
        guestName || trimmedGuestPhone
          ? {
              fullName: guestName || null,
              phone: trimmedGuestPhone || null,
            }
          : null,
      name: guestName || null,
      reference: null,
      taVolNumber: trimmedFlyNumber || null,
      taReturn: locationDoc.tripType === 'round-trip',
      taReturnAt: toDate(locationDoc.dateReturn)?.toISOString() ?? null,
      rideStartAt: null,
      rideEndAt: null,
      cancelAt: null,
      cancelReason: null,
      createAt: bookingCreatedAt ?? nowIso,
      updateAt: nowIso,
      car: {
        name: resolvedCar.name,
        registrationId: resolvedCar.registrationId,
        images: resolvedCar.images,
        category: resolvedCar.category ? { ...resolvedCar.category } : null,
      },
      client: null,
      driver: resolvedCar.defaultDriver,
      coupon: null,
      review: null,
    };
  };

  const loadCars = async (nextPage: number, replace = false) => {
    if (isLoadingCars) {
      return;
    }

    setIsLoadingCars(true);

    try {
      const res = await getTaCars({
        page: nextPage,
        startDate: locationDoc.dateStart,
        endDate: locationDoc.dateReturn,
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
    let isMounted = true;

    void calculateDistance(
      toLocationPoint(locationDoc.locationDepart),
      toLocationPoint(locationDoc.locationDest)
    )
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const nextDistanceKm =
          typeof response?.distanceMeters === 'number' ? response.distanceMeters / 1000 : null;

        setDistanceKm(nextDistanceKm);
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setDistanceKm(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [locationDoc.locationDepart, locationDoc.locationDest]);

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

  // Invalidate coupon when trip context changes
  useEffect(() => {
    if (appliedCouponCode !== null) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [selectedCar?.id, distanceKm, locationDoc.tripType]);

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

  const handleNextEtape = async (car?: Car) => {
    if (etape === EtapeReservation.RECAP) {
      try {
        const booking = await buildBooking(car);

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

    Keyboard.dismiss();
    setEtape(NEXT_ETAPE[etape]);
  };

  const actionLabel =
    etape === EtapeReservation.RECAP ? t('booking.confirmAndPay') : t('common.next');

  const handleCarPress = (car: Car) => {
    setSelectedCar(car);
    void handleNextEtape(car);
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

    if (!normalizedCode) {
      setPromoFeedback({ tone: 'error', message: t('booking.promoCodeRequired') });
      return;
    }

    if (!selectedCar?.id || totalPrice <= 0 || baseVehicleAmount <= 0) {
      setPromoFeedback({ tone: 'error', message: t('booking.promoCodeUnavailable') });
      return;
    }

    setIsApplyingPromo(true);
    if (!promoCodeOverride) {
      setCode(normalizedCode);
    }

    try {
      const response = await validateCoupon({
        code: normalizedCode,
        carId: selectedCar.id,
        bookingType: 'TA',
        vehicleAmount: baseVehicleAmount,
        orderTotal: totalPrice,
      });

      if (response.valid) {
        let successMessage: string = t('booking.promoCodeApplied') as string;
        if (typeof response.message === 'string' && response.message.trim()) {
          successMessage = response.message as string;
        } else if (normalizedCode === FIRST_BOOKING_PROMO_CODE) {
          successMessage = t('booking.promoCodeWelcomeApplied') as string;
        }

        setValidatedCoupon(response);
        setAppliedCouponCode(normalizedCode);
        setPromoFeedback({
          tone: 'success',
          message: successMessage,
        });
        return;
      }

      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      if (!isFirstBooking) {
        setPromoFeedback({
          tone: 'error',
          message: t('booking.promoCodeInvalid'),
        });
      }
    } catch (error) {
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
    if (etape !== EtapeReservation.RECAP) {
      return;
    }

    if (!selectedCar?.id || totalPrice <= 0 || baseVehicleAmount <= 0) {
      return;
    }

    if (autoPromoAttemptedRef.current || appliedCouponCode === FIRST_BOOKING_PROMO_CODE) {
      return;
    }

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
    const priceUnit = `$${t('booking.perTrip')}`;

    return (
      <View style={[{ backgroundColor: theme.bg }, { flex: 1 }]}>
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
                {t('booking.from')} :{' '}
                {locationDoc.locationDepart.description ?? t('booking.departure')}
              </Text>
              <Text className="mt-1 text-sm text-typography-500" numberOfLines={1}>
                {t('booking.to')} :{' '}
                {locationDoc.locationDest.description ?? t('booking.destination')}
              </Text>
              <Text className="mt-1 text-sm text-typography-500">{scheduleLabel}</Text>
              {distanceKm !== null ? (
                <Text className="mt-1 text-sm text-typography-500">
                  {t('booking.distance')} : {distanceKm.toFixed(1)} km
                </Text>
              ) : null}
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
              priceAmount={String(getAirportTripPrice(car, distanceKm))}
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
          onPress={() => void handleNextEtape()}>
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
                {t('booking.from')} :{' '}
                {locationDoc.locationDepart.description ?? t('booking.departure')}
              </Text>
              <Text className="mt-1 text-sm text-typography-500" numberOfLines={1}>
                {t('booking.to')} :{' '}
                {locationDoc.locationDest.description ?? t('booking.destination')}
              </Text>
              <Text className="mt-1 text-sm text-typography-500">{scheduleLabel}</Text>
              {distanceKm !== null ? (
                <Text className="mt-1 text-sm text-typography-500">
                  {t('booking.distance')} : {distanceKm.toFixed(1)} km
                </Text>
              ) : null}
            </BookingTripSummaryCard>

            <BookingOptionSectionCard
              title={t('booking.flightNumberOptional')}
              description={t('booking.flightNumberDescription')}>
              <Input variant="outline" size="control" className={filledInputClassName}>
                <InputField
                  placeholder={t('booking.flightNumberPlaceholder')}
                  placeholderTextColor={fieldThemeColors.placeholder}
                  value={flyNumber}
                  onChangeText={setFlyNumber}
                />
              </Input>
            </BookingOptionSectionCard>

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
                      keyboardType='phone-pad'
                    />
                  </Input>
                </CollapsibleContent>
              </BookingOptionSectionCard>
            </Collapsible>

            <BookingOptionSectionCard title={t('booking.pleaseNote')}>
              <View className="mt-1 flex-row">
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={fieldThemeColors.listItemText}
                />
                <Text className="ml-2 flex-1 text-sm text-typography-500">
                  {t('booking.warningCapacity')}
                </Text>
              </View>

              <View className="mt-3 flex-row">
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={fieldThemeColors.listItemText}
                />
                <Text className="ml-2 flex-1 text-sm text-typography-500">
                  {t('booking.warningImages')}
                </Text>
              </View>
            </BookingOptionSectionCard>
          </View>
        </BookingRecapLayout>
      </View>
    );
  };

  const recap = () => {
    const recapImage = selectedCar?.images[0] ?? 'https://via.placeholder.com/400x240';
    const isRoundTrip = locationDoc.tripType === 'round-trip';
    const allerScheduleLabel = formatAirportSchedule(
      { ...locationDoc, tripType: 'one-way' },
      appLocale,
      t('booking.airportDateUnavailable')
    );
    const retourScheduleLabel = (() => {
      const d = toDate(locationDoc.dateReturn);
      if (!d || Number.isNaN(d.getTime())) return t('booking.airportDateUnavailable');
      return `${d.toLocaleDateString(appLocale, { day: 'numeric', month: 'short', year: '2-digit' })} ${d.toLocaleTimeString(appLocale, { hour: '2-digit', minute: '2-digit' })}`;
    })();
    const activeDateLabel = isPositionAller ? allerScheduleLabel : retourScheduleLabel;
    const trimmedComment = comment.trim();
    const trimmedGuestName = guestName.trim();
    const trimmedGuestPhone = guestPhone.trim();
    const departureAddress = isPositionAller
      ? (locationDoc.locationDepart.description ?? t('booking.addressUnavailable'))
      : (locationDoc.locationDest.description ?? t('booking.addressUnavailable'));
    const arrivalAddress = isPositionAller
      ? (locationDoc.locationDest.description ?? t('booking.addressUnavailable'))
      : (locationDoc.locationDepart.description ?? t('booking.addressUnavailable'));
    const priceLines = [
      {
        label: `→ ${!isRoundTrip ? t('booking.oneWay') : t('booking.outbound')}`,
        value: `${tripPrice} $`,
      },
      ...(isRoundTrip
        ? [
            {
              label: `← ${t('booking.return')}`,
              value: `${tripPrice} $`,
            },
          ]
        : []),
      ...(promoDiscountAmount > 0
        ? [
            {
              label: t('booking.discount'),
              value: `- ${promoDiscountAmount} $`,
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
        onPress={() => void handleNextEtape()}>
        <ButtonText className="text-white">{actionLabel}</ButtonText>
      </Button>
    );

    return (
      <BookingRecapLayout footer={recapFooter}>
        {isRoundTrip ? (
          <View className="mb-4 flex-row">
            <Pressable
              accessibilityRole="button"
              onPress={() => setPositionAller(true)}
              className="flex-1 active:opacity-80">
              <Text
                className={cn(
                  'text-center text-base font-semibold',
                  isPositionAller ? 'text-primary' : 'text-typography-500'
                )}>
                {t('booking.outbound')}
              </Text>
              <View
                className={cn(
                  'mt-3 h-0.5 rounded-full',
                  isPositionAller ? 'bg-primary' : 'bg-outline-100'
                )}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setPositionAller(false)}
              className="flex-1 active:opacity-80">
              <Text
                className={cn(
                  'text-center text-base font-semibold',
                  !isPositionAller ? 'text-primary' : 'text-typography-500'
                )}>
                {t('booking.return')}
              </Text>
              <View
                className={cn(
                  'mt-3 h-0.5 rounded-full',
                  !isPositionAller ? 'bg-primary' : 'bg-outline-100'
                )}
              />
            </Pressable>
          </View>
        ) : null}

        <BookingRecapVehicleCard
          imageUri={recapImage}
          name={selectedCar?.name ?? t('booking.noVehicle')}
          category={selectedCar?.category?.name ?? t('booking.categoryUnavailable')}
          seats={selectedCar?.seats ?? 0}
          baggage={selectedCar?.baggage ?? 0}
          priceAmount={`${tripPrice} $`}
          priceUnit={t('booking.perTrip')}
        />

        <BookingRecapSection title={t('booking.detailsTitle')}>
          <BookingRecapDetailColumn
            label={
              isRoundTrip
                ? isPositionAller
                  ? t('booking.departureDateTime')
                  : t('booking.returnDateTime')
                : t('booking.departureDateTime')
            }
            value={activeDateLabel}
          />
          <BookingRecapDetailColumn label={t('booking.from')} value={departureAddress} />
          <BookingRecapDetailColumn label={t('booking.to')} value={arrivalAddress} />
          {distanceKm !== null ? (
            <BookingRecapDetailColumn
              label={t('booking.distance')}
              value={`${distanceKm.toFixed(1)} km`}
            />
          ) : null}
          {flyNumber ? (
            <BookingRecapDetailColumn label={t('booking.flightNumber')} value={flyNumber} />
          ) : null}
          {trimmedComment ? (
            <BookingRecapDetailColumn label={t('booking.comment')} value={trimmedComment} />
          ) : null}
          {trimmedGuestName || trimmedGuestPhone ? (
            <BookingRecapDetailColumn
              label={t('booking.reservationFor')}
              value={[trimmedGuestName, trimmedGuestPhone].filter(Boolean).join(' · ')}
            />
          ) : null}
          <View className="my-4 border-t border-outline-100" />
          <Text className="text-sm font-semibold text-typography-900">
            {t('booking.cancellationPolicy')}
          </Text>
          <Text className="mt-2 text-sm text-typography-500">
            {t('booking.cancellationPolicyText')}
          </Text>
        </BookingRecapSection>

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
          title={t('booking.priceDetails')}
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
