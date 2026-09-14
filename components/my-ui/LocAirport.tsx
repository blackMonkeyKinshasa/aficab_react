import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';

import { calculateDistance, generateIDBooking, getAllBookings } from '@/api/booking';
import { getTaCars } from '@/api/car';
import { validateCoupon } from '@/api/coupon';
import { BookingOptionSectionCard } from '@/components/my-ui/BookingOptionSectionCard';
import {
  BookingRecapDetailRow,
  BookingRecapDetailColumn,
} from '@/components/my-ui/BookingRecapDetail';
import {
  BookingDateTimeRow,
  BookingDetailsFormField,
  BookingSegmentedControl,
} from '@/components/my-ui/BookingDetailsFormField';
import { BookingRecapLayout } from '@/components/my-ui/BookingRecapLayout';
import { BookingRecapPriceSection } from '@/components/my-ui/BookingRecapPriceSection';
import { BookingRecapSection } from '@/components/my-ui/BookingRecapSection';
import {
  BookingRecapDriverNotice,
  BookingRecapServiceBanner,
  BookingRecapStatusRow,
} from '@/components/my-ui/BookingRecapStatusCards';
import { BookingRecapVehicleCard } from '@/components/my-ui/BookingRecapVehicleCard';
import { BookingStepHeader } from '@/components/my-ui/BookingStepHeader';
import { BookingTripSummaryCard } from '@/components/my-ui/BookingTripSummaryCard';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import {
  formatBookingDate,
  formatBookingTime,
  ModalDateSelector,
} from '@/components/my-ui/ModalDateSelector';
import { ModalLocationSelector } from '@/components/my-ui/ModalLocationSelector';
import { PromoCodeField } from '@/components/my-ui/PromoCodeField';
import { VehicleSelectionCard } from '@/components/my-ui/VehicleSelectionCard';
import { VehicleSelectionListLoader } from '@/components/my-ui/VehicleSelectionListLoader';
import { Button, ButtonText } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input, InputField } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { color } from '@/constants/colors';
import { Location } from '@/constants/constants';
import { EtapeReservation, ResStatus, ResType } from '@/constants/databaseEnum';
import {
  Booking,
  Car,
  CouponValidationValidResponse,
  LocationDocTA,
} from '@/constants/dataInterface';
import { bookingSpacing, controlHeightStyle } from '@/constants/spacing';
import { useAnalytics } from '@/lib/analytics';
import { useFieldThemeColors } from '@/lib/field-theme';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { supabase } from '@/lib/supabase';
import { hasMinimumBookingLeadTime } from '@/lib/time-utils';
import { useAppToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useMyStateUser, type UserState } from '@/store/user-state';

const FIRST_BOOKING_PROMO_CODE = 'VSFMFE9Q';
const NEXT_ETAPE: Record<EtapeReservation, EtapeReservation> = {
  [EtapeReservation.DETAILS]: EtapeReservation.SELECTION,
  [EtapeReservation.SELECTION]: EtapeReservation.OPTION,
  [EtapeReservation.OPTION]: EtapeReservation.RECAP,
  [EtapeReservation.RECAP]: EtapeReservation.RECAP,
};

type TripType = 'one-way' | 'round-trip';

const AIRPORT_KEYWORDS = [
  'aéroport',
  'aeroport',
  'airport',
  'charles de gaulle',
  'cdg',
  'orly',
  'roissy',
  'beauvais',
  'le bourget',
];

function containsAirport(location: Location | null): boolean {
  if (!location) return false;
  const desc = location.description.toLowerCase();
  return AIRPORT_KEYWORDS.some((kw) => desc.includes(kw));
}

type Props = {
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

export function LocAirport({ isDarkMode, onSubmit, etape, setEtape }: Props) {
  const theme = isDarkMode ? dark : light;
  const router = useRouter();
  const { appLocale, t } = useI18n();
  const toast = useAppToast();
  const analytics = useAnalytics();
  const fieldThemeColors = useFieldThemeColors();
  const { s, font } = useLayoutScale();
  const emptyCarsTitleKey = 'booking.noVehicleAvailable';
  const emptyCarsDescriptionKey = 'booking.dailyCars.empty.description';
  const [locationDoc, setLocationDoc] = useState<LocationDocTA | null>(null);
  const [tripType, setTripType] = useState<TripType>('one-way');
  const [locationDepart, setLocationDepart] = useState<Location | null>(null);
  const [locationDest, setLocationDest] = useState<Location | null>(null);
  const [visibleDepart, setVisibleDepart] = useState(false);
  const [visibleDest, setVisibleDest] = useState(false);
  const [visibleDateStart, setVisibleDateStart] = useState(false);
  const [visibleDateReturn, setVisibleDateReturn] = useState(false);
  const [dateStartStep, setDateStartStep] = useState<'date' | 'time'>('date');
  const [dateReturnStep, setDateReturnStep] = useState<'date' | 'time'>('date');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateReturn, setDateReturn] = useState<Date | null>(null);
  const userFullName = useMyStateUser((state: UserState) => state.user?.full_name?.trim() ?? '');
  const userPhone = useMyStateUser((state: UserState) => state.user?.phone?.trim() ?? '');
  const scheduleLabel = locationDoc
    ? formatAirportSchedule(locationDoc, appLocale, t('booking.airportDateUnavailable'))
    : '';
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
  const totalPrice = tripPrice * (locationDoc?.tripType === 'round-trip' ? 2 : 1);
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
    if (!resolvedCar || !locationDoc) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const resolvedBookingId = await getOrCreateBookingId();
    const trimmedFlyNumber = flyNumber.trim();
    const trimmedGuestName = isGuestSectionOpen ? guestName.trim() : '';
    const trimmedGuestPhone = isGuestSectionOpen ? guestPhone.trim() : '';
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
        trimmedGuestName || trimmedGuestPhone
          ? {
              fullName: trimmedGuestName || null,
              phone: trimmedGuestPhone || null,
            }
          : null,
      name: trimmedGuestName || null,
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
    if (isLoadingCars || !locationDoc) {
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
    if (!locationDoc) {
      setDistanceKm(null);
      return;
    }

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
  }, [locationDoc]);

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
      setEtape(EtapeReservation.DETAILS);
    };
  }, [setEtape]);

  // Invalidate coupon when trip context changes
  useEffect(() => {
    if (appliedCouponCode !== null) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [selectedCar?.id, distanceKm, locationDoc?.tripType]);

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

  const details = () => {
    const handleSubmitDetails = () => {
      if (!locationDepart || !locationDest || !dateStart) return;

      if (!hasMinimumBookingLeadTime(dateStart)) {
        Alert.alert(t('booking.advanceNoticeTitle'), t('booking.advanceNoticeMessage'));
        return;
      }

      if (!userPhone) {
        Alert.alert(t('booking.phoneRequiredTitle'), t('booking.phoneRequiredMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('booking.addNow'),
            onPress: () =>
              router.push({
                pathname: '/edit-profile',
                params: { focusField: 'phone', returnToBooking: '1' },
              }),
          },
        ]);
        return;
      }

      const doc: LocationDocTA = {
        type: ResType.TA,
        tripType,
        locationDepart,
        locationDest,
        dateStart,
        ...(tripType === 'round-trip' && dateReturn ? { dateReturn } : {}),
      };
      analytics.trackBookingStarted(ResType.TA, {
        origin: locationDepart.description,
        destination: locationDest.description,
        dateStart: dateStart.toISOString(),
        dateEnd: dateReturn?.toISOString(),
        tripType,
      });
      setSelectedCar(null);
      setCars([]);
      setDistanceKm(null);
      setLocationDoc(doc);
      setEtape(EtapeReservation.SELECTION);
    };

    const handleDateStartChange = (date: Date) => {
      setDateStart(date);
      if (dateReturn && date > dateReturn) {
        setDateReturn(null);
      }
    };

    const airportError =
      locationDepart !== null &&
      locationDest !== null &&
      !containsAirport(locationDepart) &&
      !containsAirport(locationDest)
        ? t('booking.airportRequired')
        : null;

    const isValid =
      locationDepart !== null &&
      locationDest !== null &&
      dateStart !== null &&
      (tripType === 'one-way' || dateReturn !== null) &&
      airportError === null;

    return (
      <View className="flex-1">
        <ScrollView
          contentContainerStyle={{
            paddingBottom: bookingSpacing.scrollPaddingBottom,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-4">
            <BookingStepHeader current={1} subtitle={t('booking.airportDetailsSubtitle')} />
            <View className="gap-5 rounded-2xl border border-outline-100 bg-white p-4 dark:bg-[#1E1E1E]">
              <BookingDetailsFormField
                label={t('booking.pickupAddress')}
                icon="location-outline"
                value={locationDepart?.description ?? ''}
                placeholder={t('booking.departure')}
                onPress={() => setVisibleDepart(true)}
                isDarkMode={isDarkMode}
                showChevron
              />

              <BookingDetailsFormField
                label={t('booking.dropoffAddress')}
                icon="navigate-outline"
                value={locationDest?.description ?? ''}
                placeholder={t('booking.destination')}
                onPress={() => setVisibleDest(true)}
                isDarkMode={isDarkMode}
                showChevron
              />

              {airportError ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="warning-outline" size={16} color="#ef4444" />
                  <Text className="flex-1 text-sm text-error-500">{airportError}</Text>
                </View>
              ) : null}

              <BookingSegmentedControl
                label={t('booking.transferType')}
                value={tripType}
                onChange={setTripType}
                isDarkMode={isDarkMode}
                options={[
                  { label: t('booking.oneWay'), value: 'one-way' },
                  { label: t('booking.roundTrip'), value: 'round-trip' },
                ]}
              />

              <BookingDetailsFormField
                label={t('booking.flightOptionalRecommended')}
                icon="airplane-outline"
                value={flyNumber}
                placeholder={t('booking.flightNumberPlaceholder')}
                isDarkMode={isDarkMode}
                editable
                onChangeText={setFlyNumber}
              />

              <BookingDateTimeRow
                dateLabel={t('booking.date')}
                timeLabel={t('booking.time')}
                dateValue={formatBookingDate(dateStart, appLocale)}
                timeValue={formatBookingTime(dateStart, appLocale)}
                datePlaceholder={t('booking.chooseDate')}
                timePlaceholder={t('booking.selectTime')}
                onPressDate={() => {
                  setDateStartStep('date');
                  setVisibleDateStart(true);
                }}
                onPressTime={() => {
                  setDateStartStep(dateStart ? 'time' : 'date');
                  setVisibleDateStart(true);
                }}
                isDarkMode={isDarkMode}
              />

              {tripType === 'round-trip' ? (
                <BookingDateTimeRow
                  dateLabel={t('booking.returnDate')}
                  timeLabel={t('booking.returnTime')}
                  dateValue={formatBookingDate(dateReturn, appLocale)}
                  timeValue={formatBookingTime(dateReturn, appLocale)}
                  datePlaceholder={t('booking.chooseDate')}
                  timePlaceholder={t('booking.selectTime')}
                  onPressDate={() => {
                    setDateReturnStep('date');
                    setVisibleDateReturn(true);
                  }}
                  onPressTime={() => {
                    setDateReturnStep(dateReturn ? 'time' : 'date');
                    setVisibleDateReturn(true);
                  }}
                  isDarkMode={isDarkMode}
                />
              ) : null}

              <Button
                action="primary"
                variant="solid"
                size="control"
                isDisabled={!isValid}
                className="mt-3 w-full rounded-xl"
                style={{ marginBottom: bookingSpacing.buttonMarginBottom }}
                onPress={handleSubmitDetails}>
                <ButtonText className="text-white">{t('booking.viewOffers')}</ButtonText>
              </Button>
            </View>
          </View>
        </ScrollView>

        <ModalLocationSelector
          visible={visibleDepart}
          onDismiss={() => setVisibleDepart(false)}
          onConfirm={(loc) => {
            setLocationDepart(loc);
            setVisibleDepart(false);
          }}
        />

        <ModalLocationSelector
          visible={visibleDest}
          onDismiss={() => setVisibleDest(false)}
          onConfirm={(loc) => {
            setLocationDest(loc);
            setVisibleDest(false);
          }}
        />

        <ModalDateSelector
          visible={visibleDateStart}
          onDismiss={() => setVisibleDateStart(false)}
          onConfirm={(date) => {
            handleDateStartChange(date);
            setVisibleDateStart(false);
          }}
          value={dateStart}
          minDate={new Date()}
          isStartTime
          initialStep={dateStartStep}
        />

        <ModalDateSelector
          visible={visibleDateReturn}
          onDismiss={() => setVisibleDateReturn(false)}
          onConfirm={(date) => {
            setDateReturn(date);
            setVisibleDateReturn(false);
          }}
          value={dateReturn}
          minDate={dateStart ?? new Date()}
          isStartTime={false}
          initialStep={dateReturnStep}
        />
      </View>
    );
  };

  const selectCarsPage = () => {
    if (!locationDoc) {
      return null;
    }

    const categoryUnavailableLabel = t('booking.categoryUnavailable');
    const priceUnit = `$`;
    // const priceUnit = `$${t('booking.perTrip')}`;

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
            <>
              <BookingStepHeader current={2} subtitle={t('booking.vehicleSelectionSubtitle')} />
            </>
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
    if (!locationDoc) {
      return null;
    }

    const optionFooter = (
      <View style={{ paddingHorizontal: bookingSpacing.screenPaddingX }}>
        <Button
          action="primary"
          variant="solid"
          size="control"
          className="w-full rounded-xl"
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
            <BookingStepHeader current={3} subtitle={t('booking.optionsSubtitle')} />

            <BookingOptionSectionCard
              title={t('booking.specialInstructions')}
              className="bg-white dark:bg-[#1E1E1E]">
              <Textarea
                className="rounded-xl border-outline-100 bg-background-100"
                placeholder={t('booking.commentPlaceholder')}
                placeholderTextColor={fieldThemeColors.placeholder}
                numberOfLines={5}
                value={comment}
                onChangeText={setComment}
              />
            </BookingOptionSectionCard>

            <Collapsible open={isGuestSectionOpen} onOpenChange={setIsGuestSectionOpen}>
              <BookingOptionSectionCard
                title={t('booking.whoTravels')}
                className="bg-white dark:bg-[#1E1E1E]">
                <View className="mb-3 flex-row overflow-hidden rounded-xl border border-outline-100">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsGuestSectionOpen(false)}
                    className="flex-1 flex-row items-center justify-center gap-2 px-3 py-3"
                    style={{
                      backgroundColor: !isGuestSectionOpen
                        ? isDarkMode
                          ? '#3D241C'
                          : '#FFF4EE'
                        : 'transparent',
                    }}>
                    <Ionicons
                      name="person-outline"
                      size={s(19)}
                      color={!isGuestSectionOpen ? color.primary : fieldThemeColors.listItemSubText}
                    />
                    <Text
                      className="font-medium"
                      style={{
                        color: !isGuestSectionOpen
                          ? color.primary
                          : fieldThemeColors.listItemSubText,
                        fontSize: font.sm,
                      }}>
                      {t('booking.myself')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsGuestSectionOpen(true)}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-3 py-3"
                    style={{
                      borderColor: isGuestSectionOpen ? color.primary : 'transparent',
                      backgroundColor: isGuestSectionOpen
                        ? isDarkMode
                          ? '#3D241C'
                          : '#FFF4EE'
                        : 'transparent',
                    }}>
                    <Ionicons
                      name="person-add-outline"
                      size={s(19)}
                      color={isGuestSectionOpen ? color.primary : fieldThemeColors.listItemSubText}
                    />
                    <Text
                      className="font-medium"
                      style={{
                        color: isGuestSectionOpen
                          ? color.primary
                          : fieldThemeColors.listItemSubText,
                        fontSize: font.sm,
                      }}>
                      {t('booking.anotherPerson')}
                    </Text>
                  </Pressable>
                </View>

                {!isGuestSectionOpen ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.editTitle')}
                    className="active:opacity-80"
                    onPress={() => router.push('/edit-profile')}>
                    <View pointerEvents="none" className="gap-3">
                      <Input
                        variant="outline"
                        size="control"
                        className="rounded-xl border border-outline-100 bg-background-100">
                        <InputField
                          placeholder={t('booking.fullName')}
                          placeholderTextColor={fieldThemeColors.placeholder}
                          value={userFullName}
                          editable={false}
                        />
                      </Input>

                      <Input
                        variant="outline"
                        size="control"
                        className="rounded-xl border border-outline-100 bg-background-100">
                        <InputField
                          placeholder={t('booking.phoneNumber')}
                          placeholderTextColor={fieldThemeColors.placeholder}
                          value={userPhone}
                          editable={false}
                          keyboardType="phone-pad"
                        />
                      </Input>
                    </View>
                    <View className="mt-3 flex-row items-center justify-end">
                      <Ionicons name="create-outline" size={s(16)} color={color.primary} />
                      <Text
                        className="ml-1 font-medium"
                        style={{ color: color.primary, fontSize: font.sm }}>
                        {t('profile.editTitle')}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}

                <CollapsibleContent>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void handlePickGuestFromContacts()}
                    className="mb-3 flex-row items-center rounded-xl border border-outline-100 px-3 py-3 active:opacity-80">
                    <Ionicons
                      name="people-outline"
                      size={s(18)}
                      color={fieldThemeColors.listItemText}
                    />
                    <Text
                      className="ml-2 font-medium text-typography-900"
                      style={{ fontSize: font.sm }}>
                      {t('booking.importFromContacts')}
                    </Text>
                  </Pressable>

                  <Input
                    variant="outline"
                    size="control"
                    className="rounded-xl border border-outline-100 bg-background-100">
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
                    className="mt-3 rounded-xl border border-outline-100 bg-background-100">
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

            <BookingOptionSectionCard
              title={t('booking.pleaseNote')}
              className="bg-white dark:bg-[#1E1E1E]">
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
    if (!locationDoc) {
      return null;
    }

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
    const trimmedGuestName = isGuestSectionOpen ? guestName.trim() : '';
    const trimmedGuestPhone = isGuestSectionOpen ? guestPhone.trim() : '';
    const travelerName = isGuestSectionOpen ? trimmedGuestName : userFullName;
    const travelerPhone = isGuestSectionOpen ? trimmedGuestPhone : userPhone;
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
        className="w-full rounded-xl"
        style={controlHeightStyle}
        onPress={() => void handleNextEtape()}>
        <ButtonText className="text-white">
          {t('booking.confirmAndPay')} · {finalTotalPrice} $
        </ButtonText>
      </Button>
    );

    return (
      <BookingRecapLayout footer={recapFooter}>
        <BookingStepHeader current={4} subtitle={t('booking.recapSubtitle')} />
        <BookingRecapServiceBanner
          icon="airplane-outline"
          label={t('booking.airportService')}
          status={t('booking.pendingStatus')}
        />

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
          durationLabel={isRoundTrip ? t('booking.roundTrip') : t('booking.oneWay')}
        />

        <BookingRecapSection title={t('booking.detailsTitle')}>
          <BookingRecapDetailColumn
            icon="calendar-outline"
            label={
              isRoundTrip
                ? isPositionAller
                  ? t('booking.departureDateTime')
                  : t('booking.returnDateTime')
                : t('booking.departureDateTime')
            }
            value={activeDateLabel}
          />
          <BookingRecapDetailColumn
            icon="location-outline"
            label={t('booking.from')}
            value={departureAddress}
          />
          <BookingRecapDetailColumn
            icon="navigate-outline"
            label={t('booking.to')}
            value={arrivalAddress}
          />
          {distanceKm !== null ? (
            <BookingRecapDetailColumn
              icon="speedometer-outline"
              label={t('booking.distance')}
              value={`${distanceKm.toFixed(1)} km`}
            />
          ) : null}
          {flyNumber ? (
            <BookingRecapDetailColumn
              icon="airplane-outline"
              label={t('booking.flightNumber')}
              value={flyNumber}
            />
          ) : null}
          {trimmedComment ? (
            <BookingRecapDetailColumn
              icon="chatbubble-ellipses-outline"
              label={t('booking.specialInstructions')}
              value={trimmedComment.replace(/\n/g, ' · ')}
            />
          ) : null}
          {travelerName || travelerPhone ? (
            <BookingRecapDetailColumn
              icon="person-outline"
              label={t('booking.reservationFor')}
              value={[travelerName, travelerPhone].filter(Boolean).join(' · ')}
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

        <BookingRecapStatusRow
          label={t('booking.paymentLabel')}
          value={t('booking.paymentPending')}
        />
      </BookingRecapLayout>
    );
  };

  const isSheetStep = etape === EtapeReservation.SELECTION || etape === EtapeReservation.OPTION;
  const isDetailsStep = etape === EtapeReservation.DETAILS;

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: theme.bg,
        ...(!isSheetStep && !isDetailsStep
          ? { paddingHorizontal: bookingSpacing.screenPaddingX, paddingTop: 16 }
          : {}),
      }}>
      {etape === EtapeReservation.DETAILS && details()}
      {etape === EtapeReservation.SELECTION && selectCarsPage()}
      {etape === EtapeReservation.OPTION && selectOption()}
      {etape === EtapeReservation.RECAP && recap()}
    </View>
  );
}

const light = {
  bg: '#F7F7F8',
  card: '#ffffff',
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
