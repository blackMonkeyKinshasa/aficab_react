import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { calculateDistance, generateIDBooking, getAllBookings } from '@/api/booking';
import { getTaCars } from '@/api/car';
import { validateCoupon } from '@/api/coupon';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import { PromoCodeField } from '@/components/my-ui/PromoCodeField';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Text as UIText } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { defautColor } from '@/constants/constants';
import { EtapeReservation, ResStatus, ResType } from '@/constants/databaseEnum';
import {
  Booking,
  Car,
  CouponValidationValidResponse,
  LocationDocTA,
} from '@/constants/dataInterface';
import { TranslationKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const FIRST_BOOKING_PROMO_CODE = 'VSFMFE9Q';

const NEXT_ETAPE: Record<EtapeReservation, EtapeReservation> = {
  [EtapeReservation.SELECTION]: EtapeReservation.OPTION,
  [EtapeReservation.OPTION]: EtapeReservation.RECAP,
  [EtapeReservation.RECAP]: EtapeReservation.RECAP,
};

const PREVIOUS_ETAPE: Partial<Record<EtapeReservation, EtapeReservation>> = {
  [EtapeReservation.OPTION]: EtapeReservation.SELECTION,
  [EtapeReservation.RECAP]: EtapeReservation.OPTION,
};

type Props = {
  locationDoc: LocationDocTA;
  isDarkMode: boolean;
  onSubmit: (doc: Booking) => void;
  etape: EtapeReservation;
  setEtape: (etape: EtapeReservation) => void;
};

type Theme = {
  bg: string;
  card: string;
  text: string;
  subText: string;
  border: string;
  input: string;
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

function getCouponDiscountAmount(coupon: CouponValidationValidResponse | null, orderTotal: number) {
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

type CarItemProps = {
  car: Car;
  theme: Theme;
  isSelected: boolean;
  distanceKm: number | null;
  onPress: (car: Car) => void;
  t: (key: TranslationKey) => string;
};

function getAirportPriceLabel(car: Car, distanceKm: number | null) {
  return `$ ${getAirportTripPrice(car, distanceKm)}`;
}

function CarItem({ car, theme, isSelected, distanceKm, onPress, t }: CarItemProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(car)}>
      <View
        style={[styles.card, { backgroundColor: theme.card }, isSelected && styles.selectedCard]}>
        <Text style={[styles.carName, { color: theme.text }]}>{car.name}</Text>

        <Text style={{ color: theme.subText }}>
          {car.category?.name ?? t('booking.categoryUnavailable')}
        </Text>

        <View style={styles.row}>
          <View style={styles.iconRow}>
            <Ionicons name="person" size={16} color={theme.text} />
            <Text style={{ color: theme.text, marginLeft: 5 }}>{car.seats}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: '#f5d7a1' }]}>
            <Ionicons name="briefcase" size={16} color="#000" />
            <Text style={{ marginLeft: 5 }}>{car.baggage}</Text>
          </View>
        </View>

        <Image
          source={{ uri: car.images[0] ?? 'https://via.placeholder.com/400x240' }}
          style={styles.image}
        />

        <Text style={styles.price}>
          {getAirportPriceLabel(car, distanceKm)} {t('booking.perTrip')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function LocAirport({ locationDoc, isDarkMode, onSubmit, etape, setEtape }: Props) {
  const theme = isDarkMode ? dark : light;
  const router = useRouter();
  const { appLocale, t } = useI18n();
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
      isPaid: false,
      total: resolvedFinalTotal,
      options: {
        tripType: locationDoc.tripType,
        priceTA: resolvedCar.priceTA,
        distanceKm,
        couponCode: appliedCouponCode,
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
      taReturnId: null,
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
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

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
      setIsLoadingMore(false);
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
      setIsRefreshing(true);
      void loadCars(1, true);
    }
  }, [etape]);

  useEffect(() => {
    return () => {
      setEtape(EtapeReservation.SELECTION);
    };
  }, [setEtape]);

  useEffect(() => {
    if (appliedCouponCode !== null) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [selectedCar?.id, distanceKm, locationDoc.tripType]);

  useEffect(() => {
    if (appliedCouponCode && code.trim() !== appliedCouponCode) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [code, appliedCouponCode]);

  useEffect(() => {
    autoPromoAttemptedRef.current = false;
  }, [etape, selectedCar?.id, distanceKm, locationDoc.tripType]);

  const handleNextEtape = async (car?: Car) => {
    if (etape === EtapeReservation.RECAP) {
      try {
        const booking = await buildBooking(car);

        if (!booking) {
          Alert.alert(t('common.information'), t('booking.selectVehicleBeforeConfirm'));
          return;
        }

        onSubmit(booking);
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('booking.generationImpossible')
        );
      }

      return;
    }

    setEtape(NEXT_ETAPE[etape]);
  };

  const actionLabel =
    etape === EtapeReservation.RECAP ? t('booking.confirmAndPay') : t('common.next');

  const handleCarPress = (car: Car) => {
    setSelectedCar(car);
    void handleNextEtape(car);
  };

  const handleLoadMore = () => {
    if (etape !== EtapeReservation.SELECTION || !hasMore || isLoadingMore) {
      return;
    }

    void loadCars(page + 1);
  };

  const handleRefresh = () => {
    if (isLoadingMore) {
      return;
    }

    setIsRefreshing(true);
    setHasMore(true);
    void loadCars(1, true);
  };

  const handleApplyPromoCode = async (promoCodeOverride?: string) => {
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
    setCode(normalizedCode);

    try {
      const response = await validateCoupon({
        code: normalizedCode,
        carId: selectedCar.id,
        bookingType: 'TA',
        vehicleAmount: baseVehicleAmount,
        orderTotal: totalPrice,
      });

      if (response.valid) {
        setValidatedCoupon(response);
        setAppliedCouponCode(normalizedCode);
        setPromoFeedback({
          tone: 'success',
          message:
            response.message ??
            (normalizedCode === FIRST_BOOKING_PROMO_CODE
              ? t('booking.promoCodeWelcomeApplied')
              : t('booking.promoCodeApplied')),
        });
        return;
      }

      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback({
        tone: 'error',
        message: response.message || t('booking.promoCodeInvalid'),
      });
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

  useEffect(() => {
    if (
      etape !== EtapeReservation.RECAP ||
      !selectedCar?.id ||
      totalPrice <= 0 ||
      baseVehicleAmount <= 0
    ) {
      return;
    }

    if (autoPromoAttemptedRef.current) {
      return;
    }

    if (appliedCouponCode === FIRST_BOOKING_PROMO_CODE) {
      return;
    }

    if (code.trim() && code.trim() !== FIRST_BOOKING_PROMO_CODE) {
      return;
    }

    autoPromoAttemptedRef.current = true;
    let isMounted = true;

    const applyWelcomePromoIfEligible = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) {
          return;
        }

        const bookings = await getAllBookings(user.id);

        if (!isMounted || !Array.isArray(bookings) || bookings.length > 0) {
          return;
        }

        await handleApplyPromoCode(FIRST_BOOKING_PROMO_CODE);
      } catch {
        // L'auto-application reste silencieuse si la verification d'eligibilite echoue.
      }
    };

    void applyWelcomePromoIfEligible();

    return () => {
      isMounted = false;
    };
  }, [appliedCouponCode, baseVehicleAmount, code, etape, selectedCar?.id, totalPrice]);

  const handlePreviousEtape = () => {
    const previousEtape = PREVIOUS_ETAPE[etape];

    if (previousEtape) {
      setEtape(previousEtape);
      return;
    }

    router.back();
  };

  const myButton = () => {
    return (
      <View className="mt-4 flex-row gap-3">
        <Button
          className="h-12 items-center justify-center rounded-lg bg-orange-500"
          style={{
            flex: etape !== EtapeReservation.SELECTION ? 1 : undefined,
            width: etape === EtapeReservation.SELECTION ? '100%' : undefined,
          }}
          onPress={() => void handleNextEtape()}>
          <UIText className="text-base font-bold text-white">{actionLabel}</UIText>
        </Button>
      </View>
    );
  };

  const selectCarsPage = () => {
    return (
      <View className="flex-1">
        <View style={[styles.addressCard, { backgroundColor: theme.card }]}>
          <View style={styles.addressContent}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.addressText, { color: theme.text }]}>
              {t('booking.from')} :{' '}
              {locationDoc.locationDepart.description ?? t('booking.departure')}
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: theme.subText }}>
              {t('booking.to')} : {locationDoc.locationDest.description ?? t('booking.destination')}
            </Text>
            <Text style={{ color: theme.subText, marginTop: 4 }}>{scheduleLabel}</Text>
            {distanceKm !== null ? (
              <Text style={{ color: theme.subText, marginTop: 4 }}>
                {t('booking.distance')} : {distanceKm.toFixed(1)} km
              </Text>
            ) : null}
          </View>
          <Ionicons name="pencil" size={20} color={theme.text} onPress={() => router.back()} />
        </View>

        <FlatList
          data={cars}
          keyExtractor={(car) => car.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            isLoadingMore ? (
              <Text style={[styles.listStateText, { color: theme.subText }]}>
                {t('booking.loading')}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            !isRefreshing && !isLoadingMore ? (
              <ErrorEmpty
                isDark={isDarkMode}
                title={t(emptyCarsTitleKey)}
                description={t(emptyCarsDescriptionKey)}
              />
            ) : null
          }
          renderItem={({ item: car }) => (
            <CarItem
              car={car}
              theme={theme}
              isSelected={selectedCar?.id === car.id}
              distanceKm={distanceKm}
              onPress={handleCarPress}
              t={t}
            />
          )}
        />
      </View>
    );
  };

  const selectOption = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.container]}>
              {/* FLY NUMBER */}
              <View style={[styles.section, { borderColor: theme.border }]}>
                <View style={[styles.sectionHeader, { flexDirection: 'column' }]}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                    {t('booking.flightNumberOptional')}
                  </Text>

                  <Text
                    style={{ color: theme.subText, fontSize: 14, fontWeight: '400', marginTop: 8 }}>
                    {t('booking.flightNumberDescription')}
                  </Text>
                </View>

                <Input
                  placeholder={t('booking.flightNumberPlaceholder')}
                  placeholderTextColor={theme.subText}
                  value={flyNumber}
                  onChangeText={setFlyNumber}
                  style={styles.input}
                />
              </View>

              {/* COMMENT */}
              <View style={[styles.section, { borderColor: theme.border }]}>
                <View style={[styles.sectionHeader, { flexDirection: 'column' }]}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                    {t('booking.commentOptional')}
                  </Text>
                  <Text
                    style={{ color: theme.subText, fontSize: 14, fontWeight: '400', marginTop: 8 }}>
                    {t('booking.commentDescription')}
                  </Text>
                </View>

                <Input
                  placeholder={t('booking.commentPlaceholder')}
                  placeholderTextColor={theme.subText}
                  multiline
                  value={comment}
                  onChangeText={setComment}
                  style={styles.input}
                />
              </View>

              {/* BOOKING */}
              <Collapsible open={isGuestSectionOpen} onOpenChange={setIsGuestSectionOpen}>
                <View style={[styles.section, { borderColor: theme.border }]}>
                  <CollapsibleTrigger asChild>
                    <TouchableOpacity activeOpacity={0.8} style={styles.sectionHeader}>
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                        {t('booking.bookForOtherPersonOptional')}
                      </Text>
                      <Ionicons
                        name={isGuestSectionOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.subText}
                      />
                    </TouchableOpacity>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Input
                      placeholder={t('booking.fullName')}
                      placeholderTextColor={theme.subText}
                      value={guestName}
                      onChangeText={setGuestName}
                      style={styles.input}
                    />

                    <Input
                      placeholder={t('booking.phoneNumber')}
                      placeholderTextColor={theme.subText}
                      value={guestPhone}
                      onChangeText={setGuestPhone}
                      style={styles.input}
                    />
                  </CollapsibleContent>
                </View>
              </Collapsible>

              {/* WARNING GUEST */}
              <View style={[styles.section, { borderColor: theme.border }]}>
                <View style={[styles.sectionHeader, { flexDirection: 'column' }]}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                    {t('booking.pleaseNote')}
                  </Text>

                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.text} />
                    <Text
                      style={{
                        color: theme.subText,
                        fontSize: 14,
                        fontWeight: '400',
                        flex: 1,
                        marginLeft: 8,
                      }}>
                      {t('booking.warningCapacity')}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.text} />
                    <Text
                      style={{
                        color: theme.subText,
                        fontSize: 14,
                        fontWeight: '400',
                        flex: 1,
                        marginLeft: 8,
                      }}>
                      {t('booking.warningImages')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* BUTTON */}

              {myButton()}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  };

  const recap = () => {
    const recapImage = selectedCar?.images[0] ?? 'https://via.placeholder.com/400x240';
    const tripTypeLabel =
      locationDoc.tripType === 'round-trip' ? t('booking.outbound') : t('booking.oneWay');
    const isRoundTrip = locationDoc.tripType === 'round-trip' ? true : false;
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
    const trimmedFlyNumber = flyNumber.trim();
    const trimmedComment = comment.trim();
    const trimmedGuestName = guestName.trim();
    const trimmedGuestPhone = guestPhone.trim();

    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row' }}>
            {/*Aller*/}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => {
                setPositionAller(true);
              }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text
                  style={[
                    styles.recapSectionTitle,
                    { color: isPositionAller ? defautColor : theme.text },
                  ]}>
                  {tripTypeLabel}
                </Text>

                {/*ligne de séparation*/}

                <View style={{ flexDirection: 'row', height: 1, marginVertical: 12 }}>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: isPositionAller ? defautColor : theme.border,
                    }}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/*Retour*/}
            {isRoundTrip && (
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => {
                  setPositionAller(false);
                }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text
                    style={[
                      styles.recapSectionTitle,
                      { color: !isPositionAller ? defautColor : theme.text },
                    ]}>
                    {t('booking.return')}
                  </Text>
                  {/*ligne de séparation*/}
                  <View style={{ flexDirection: 'row', height: 1, marginVertical: 12 }}>
                    <View
                      style={{
                        flex: 1,
                        height: 1,
                        backgroundColor:
                          isRoundTrip && !isPositionAller ? defautColor : theme.border,
                      }}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/*Date et heure ainsi que lieux de depart*/}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location-outline" size={18} color={theme.text} />

            <View style={{ flex: 1, justifyContent: 'center', marginLeft: 4 }}>
              <Text style={[styles.recapDate, { color: theme.subText }]}>{activeDateLabel}</Text>
              <Text numberOfLines={1} style={[styles.recapDescription, { color: theme.text }]}>
                {isPositionAller
                  ? (locationDoc.locationDepart.description ?? t('booking.addressUnavailable'))
                  : (locationDoc.locationDest.description ?? t('booking.addressUnavailable'))}
              </Text>
            </View>
          </View>

          {/*Estimation de la distance ou de temps entre lees deux points*/}
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 10 }}>
            <View style={{ height: 40, width: 1, backgroundColor: theme.border }} />

            <View style={{ flex: 1, justifyContent: 'center', marginLeft: 13 }}>
              <Text
                numberOfLines={1}
                style={[styles.recapDate, { color: theme.subText, marginLeft: 4 }]}>
                {t('booking.approxDistance')} {distanceKm !== null ? distanceKm.toFixed(1) : '0.0'}{' '}
                km
              </Text>
            </View>
          </View>

          {/*Date et heure ainsi que lieux de d'arrivée*/}
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 4 }}>
            <Ionicons name="navigate-outline" size={18} color={theme.text} />

            <View style={{ flex: 1, justifyContent: 'center', marginLeft: 4 }}>
              <Text
                numberOfLines={1}
                style={[styles.recapDescription, { color: theme.text, marginLeft: 4 }]}>
                {isPositionAller
                  ? (locationDoc.locationDest.description ?? t('booking.addressUnavailable'))
                  : (locationDoc.locationDepart.description ?? t('booking.addressUnavailable'))}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionSansBordure}>
          <View style={styles.carRow}>
            <Image source={{ uri: recapImage }} style={styles.carImage} resizeMode="cover" />

            <View style={{ flex: 1, marginLeft: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recapCarTitle, { color: theme.text, textAlign: 'center' }]}>
                  {selectedCar?.name ?? t('booking.noVehicle')}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.recapCarSubtitle, { color: theme.subText, textAlign: 'center' }]}>
                  {selectedCar?.category?.name ?? t('booking.categoryUnavailable')}
                </Text>
              </View>

              <View
                style={[
                  styles.recapCarDetails,
                  { flex: 1, alignItems: 'center', justifyContent: 'center' },
                ]}>
                <View style={[styles.recapBadge, { backgroundColor: theme.input }]}>
                  <Ionicons name="person" size={14} color={theme.text} />
                  <Text style={[styles.recapBadgeText, { color: theme.text }]}>
                    {selectedCar?.seats ?? 0}
                  </Text>
                </View>
                <View style={[styles.recapBadge, { backgroundColor: '#f5d7a1' }]}>
                  <Ionicons name="briefcase" size={14} color="#000" />
                  <Text style={[styles.recapBadgeText, { color: '#000' }]}>
                    {selectedCar?.baggage ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* WARNING GUEST */}
        <View style={[styles.section, { borderColor: theme.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: 'column' }]}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              {t('booking.cancellationPolicy')}
            </Text>

            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Ionicons name="information-circle-outline" size={16} color={theme.text} />
              <Text
                style={{
                  color: theme.subText,
                  fontSize: 14,
                  fontWeight: '400',
                  flex: 1,
                  marginLeft: 8,
                }}>
                {t('booking.cancellationPolicyText')}
              </Text>
            </View>
          </View>
        </View>

        {flyNumber ? (
          <View
            style={[styles.section, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.recapSectionTitle, { color: theme.text }]}>
              {t('booking.flightNumber')}
            </Text>
            <Text style={[styles.recapDescription, { color: theme.subText }]}>{flyNumber}</Text>
          </View>
        ) : null}

        {comment ? (
          <View
            style={[styles.section, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.recapSectionTitle, { color: theme.text }]}>
              {t('booking.comment')}
            </Text>
            <Text style={[styles.recapDescription, { color: theme.subText }]}>
              {trimmedComment}
            </Text>
          </View>
        ) : null}

        {guestName || guestPhone ? (
          <View
            style={[styles.section, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.recapSectionTitle, { color: theme.text }]}>
              {t('booking.reservationFor')}
            </Text>
            {guestName ? (
              <Text style={[styles.recapDescription, { color: theme.subText }]}>
                {trimmedGuestName}
              </Text>
            ) : null}
            {guestPhone ? (
              <Text style={[styles.recapDescription, { color: theme.subText, marginTop: 4 }]}>
                {trimmedGuestPhone}
              </Text>
            ) : null}
          </View>
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

        {promoDiscountAmount > 0 ? (
          <View style={[styles.section, { borderColor: theme.border }]}>
            <View style={styles.recapPriceRow}>
              <Text style={[styles.recapPriceLabel, { color: theme.subText }]}>
                {t('booking.discount')}
              </Text>
              <Text
                style={[
                  styles.recapPriceValue,
                  { color: theme.text },
                ]}>{`- ${promoDiscountAmount} $`}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { borderColor: theme.border }]}>
          <Text style={[styles.recapSectionTitle, { color: theme.text }]}>
            {t('booking.priceDetails')}
          </Text>
          <View style={styles.recapPriceRow}>
            <Text style={[styles.recapPriceLabel, { color: theme.subText }]}>
              {' '}
              → {!isRoundTrip ? t('booking.oneWay') : t('booking.outbound')} :
            </Text>
            <Text style={[styles.recapPriceValue, { color: theme.text }]}>{tripPrice} $</Text>
          </View>

          {isRoundTrip && (
            <View style={styles.recapPriceRow}>
              <Text style={[styles.recapPriceLabel, { color: theme.subText }]}>
                {' '}
                ← {t('booking.return')} :
              </Text>
              <Text style={[styles.recapPriceValue, { color: theme.text }]}>{tripPrice} $</Text>
            </View>
          )}

          {/*ligne de séparation*/}
          <View style={{ flexDirection: 'row', height: 1, marginVertical: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          </View>

          <View style={styles.recapPriceRow}>
            <Text style={[styles.recapTotalLabel, { color: theme.text }]}>
              {t('booking.total')}
            </Text>
            <Text style={[styles.recapTotalValue, { color: theme.text }]}>{finalTotalPrice} $</Text>
          </View>
        </View>

        {myButton()}
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 px-6 py-4">
      {etape === EtapeReservation.SELECTION && selectCarsPage()}

      {etape === EtapeReservation.OPTION && selectOption()}
      {etape === EtapeReservation.RECAP && recap()}
    </View>
  );
}

const light = {
  bg: '#F1F4F8',
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 15,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
  },

  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },

  sectionSansBordure: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },

  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  optionRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoButton: {
    padding: 2,
  },

  input: {
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },

  button: {
    backgroundColor: '#ff5a00',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 'auto',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  addressCard: {
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  addressText: {
    fontSize: 16,
    fontWeight: '500',
  },

  addressContent: {
    flex: 1,
    paddingRight: 12,
  },

  card: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },

  carRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },

  carImage: {
    width: 150,
    height: 100,
    borderRadius: 10,
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: 'orange',
  },

  listContent: {
    paddingBottom: 20,
  },

  listStateText: {
    textAlign: 'center',
    paddingVertical: 16,
  },

  selectedCarText: {
    marginTop: 12,
    fontSize: 14,
  },

  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  sectionTitle: {
    fontWeight: '600',
    marginBottom: 10,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  totalPriceText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
  },

  carName: {
    fontSize: 18,
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    gap: 15,
  },

  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
  },

  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 10,
  },

  price: {
    marginTop: 10,
    color: 'orange',
    fontWeight: 'bold',
    fontSize: 16,
  },

  recapCarTitle: {
    fontWeight: '700',
  },

  recapCarSubtitle: {
    marginBottom: 5,
  },

  recapCarDetails: {
    flexDirection: 'row',
    gap: 10,
  },

  recapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  recapBadgeText: {
    marginLeft: 4,
  },

  recapSectionTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },

  recapDescription: {
    fontSize: 14,
  },
  recapDate: {
    fontSize: 12,
  },

  recapPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },

  recapPriceLabel: {},

  recapPriceValue: {
    fontWeight: '600',
  },

  recapTotalLabel: {
    fontWeight: '700',
  },

  recapTotalValue: {
    fontWeight: '700',
  },
});
