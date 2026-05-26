import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { generateIDBooking, getAllBookings } from '@/api/booking';
import { getLocCars } from '@/api/car';
import { validateCoupon } from '@/api/coupon';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import { PromoCodeField } from '@/components/my-ui/PromoCodeField';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Text as UIText } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { EtapeReservation, ResStatus, ResType } from '@/constants/databaseEnum';
import {
  Booking,
  Car,
  CouponValidationValidResponse,
  LocationDocLOC,
} from '@/constants/dataInterface';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const FIRST_BOOKING_PROMO_CODE = 'VSFMFE9Q';

const NEXT_ETAPE: Record<EtapeReservation, EtapeReservation> = {
  [EtapeReservation.SELECTION]: EtapeReservation.OPTION,
  [EtapeReservation.OPTION]: EtapeReservation.RECAP,
  [EtapeReservation.RECAP]: EtapeReservation.RECAP,
};

type Theme = {
  bg: string;
  card: string;
  text: string;
  subText: string;
  border: string;
  input: string;
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

function toLocationPoint(locationDoc: LocationDocLOC) {
  return {
    label: locationDoc.location.description,
    lat: locationDoc.location.lat,
    lng: locationDoc.location.lng,
  };
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

type CarItemProps = {
  car: Car;
  theme: Theme;
  isSelected: boolean;
  categoryUnavailableLabel: string;
  perDayLabel: string;
  onPress: (car: Car) => void;
};

function CarItem({
  car,
  theme,
  isSelected,
  categoryUnavailableLabel,
  perDayLabel,
  onPress,
}: CarItemProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(car)}>
      <View
        style={[styles.card, { backgroundColor: theme.card }, isSelected && styles.selectedCard]}>
        <Text style={[styles.carName, { color: theme.text }]}>{car.name}</Text>

        <Text style={{ color: theme.subText }}>
          {car.category?.name ?? categoryUnavailableLabel}
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
          $ {car.priceLOC} {perDayLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
  const promoDiscountAmount = getCouponDiscountAmount(validatedCoupon, totalPrice);
  const finalTotalPrice = getCouponFinalTotal(validatedCoupon, totalPrice);

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

    const selectedOptions = {
      fuel: fuel ? (fuelPrice ?? 0) : 0,
      flex: flex ? (flexPrice ?? 0) : 0,
      premium: premium ? (premiumPrice ?? 0) : 0,
      couponCode: appliedCouponCode,
      couponDiscountAmount: promoDiscountAmount,
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
      arrivalAt: toDate(locationDoc.dateEnd).toISOString(),
      departure: toLocationPoint(locationDoc),
      arrival: null,
      commentaire: trimmedComment || null,
      isPaid: false,
      total: finalTotalPrice,
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
      taReturnId: null,
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

  useEffect(() => {
    if (appliedCouponCode !== null) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [appliedCouponCode, selectedCar?.id, fuel, flex, premium, rentalDays]);

  useEffect(() => {
    if (appliedCouponCode && code.trim() !== appliedCouponCode) {
      setValidatedCoupon(null);
      setAppliedCouponCode(null);
      setPromoFeedback(null);
    }
  }, [code, appliedCouponCode]);

  useEffect(() => {
    autoPromoAttemptedRef.current = false;
  }, [etape, selectedCar?.id, fuel, flex, premium, rentalDays]);

  const loadCars = async (nextPage: number, replace = false) => {
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

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
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (etape === EtapeReservation.SELECTION) {
      setCars([]);
      setPage(1);
      setHasMore(true);
      setIsRefreshing(true);
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

  const handleFuelInfoPress = () => {
    Alert.alert(t('common.information'), t('booking.fuelInfo'));
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
        bookingType: 'LOC',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- welcome promo runs once per recap context
  }, [appliedCouponCode, baseVehicleAmount, code, etape, selectedCar?.id, totalPrice]);

  const myButton = () => {
    return (
      <View className="mt-4 flex-row">
        <Button
          className="h-12 w-full items-center justify-center rounded-lg bg-orange-500"
          onPress={handleNextEtape}>
          <UIText className="text-base font-bold text-white">{actionLabel}</UIText>
        </Button>
      </View>
    );
  };

  const PriceRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.priceRow}>
      <Text style={{ color: theme.text }}>{label}</Text>
      <Text style={{ color: theme.text }}>{value}</Text>
    </View>
  );

  const selectCarsPage = () => {
    return (
      <View className="flex-1">
        {/* ADDRESS CARD */}
        <View style={[styles.addressCard, { backgroundColor: theme.card }]}>
          <View className="mr-2 flex-1">
            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
              {locationDoc.location.description ?? t('booking.departure')}
            </Text>
            <Text style={{ color: theme.subText, marginTop: 4 }} numberOfLines={1}>
              {dateRangeLabel}
            </Text>
          </View>
          <Ionicons
            className="mr-1"
            name="pencil"
            size={20}
            color={theme.text}
            onPress={() => router.back()}
          />
        </View>

        {/* LIST */}
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
              categoryUnavailableLabel={t('booking.categoryUnavailable')}
              perDayLabel={t('booking.perDay')}
              onPress={handleCarPress}
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
        <TouchableWithoutFeedback
          onPress={() => {
            console.log('touched');
          }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.container]}>
              {/* OPTIONS */}
              {hasAnyOption ? (
                <View style={[styles.section, { borderColor: theme.border }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>
                      {t('booking.optionsTitle')}
                    </Text>
                  </View>

                  {/* Fuel */}
                  {hasFuelOption ? (
                    <View style={styles.optionRow}>
                      <View className="mr-3 flex-1">
                        <View style={styles.optionTitleRow}>
                          <Text style={{ color: theme.text }}>{t('booking.fuelFees')}</Text>
                          <TouchableOpacity onPress={handleFuelInfoPress} style={styles.infoButton}>
                            <Ionicons
                              name="information-circle-outline"
                              size={18}
                              color={theme.subText}
                            />
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: theme.subText, fontSize: 12 }}>
                          {t('booking.fuelFeesDescription')}
                        </Text>
                      </View>

                      <View style={styles.optionRight}>
                        <Text style={{ color: theme.text }}>{fuelPrice} $</Text>
                        <Switch value={fuel} onValueChange={setFuel} />
                      </View>
                    </View>
                  ) : null}

                  {/* Flex */}
                  {hasFlexOption ? (
                    <View style={styles.optionRow}>
                      <View className="mr-3 flex-1">
                        <Text style={{ color: theme.text }}>{t('booking.flexExtraHours')}</Text>
                        <Text style={{ color: theme.subText, fontSize: 12 }}>
                          {t('booking.flexExtraHoursDescription')}
                        </Text>
                      </View>

                      <View style={styles.optionRight}>
                        <Text style={{ color: theme.text }}>{flexPrice} $</Text>
                        <Switch value={flex} onValueChange={handleFlexChange} />
                      </View>
                    </View>
                  ) : null}

                  {/* Premium */}
                  {hasPremiumOption ? (
                    <View style={styles.optionRow}>
                      <View className="mr-3 flex-1">
                        <Text style={{ color: theme.text }}>{t('booking.premiumExtraHours')}</Text>
                        <Text style={{ color: theme.subText, fontSize: 12 }}>
                          {t('booking.premiumExtraHoursDescription')}
                        </Text>
                      </View>

                      <View style={styles.optionRight}>
                        <Text style={{ color: theme.text }}>{premiumPrice} $</Text>
                        <Switch value={premium} onValueChange={handlePremiumChange} />
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* COMMENT */}
              <View style={[styles.section, { borderColor: theme.border }]}>
                <View style={styles.sectionHeader}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>
                    {t('booking.commentOptional')}
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

              {/* BOOKING for friend */}
              <Collapsible open={isGuestSectionOpen} onOpenChange={setIsGuestSectionOpen}>
                <View style={[styles.section, { borderColor: theme.border }]}>
                  <CollapsibleTrigger asChild>
                    <TouchableOpacity activeOpacity={0.8} style={styles.sectionHeader}>
                      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', flex: 1 }}>
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
    const trimmedComment = comment.trim();
    const trimmedGuestName = guestName.trim();
    const trimmedGuestPhone = guestPhone.trim();
    const hasGuestInfo = Boolean(trimmedGuestName || trimmedGuestPhone);
    const selectedOptions = [
      fuel && fuelPrice !== null ? t('booking.fuelIncluded') : t('booking.fuelAtClientExpense'),
      flex && flexPrice !== null ? t('booking.flexHoursSummary') : null,
      premium && premiumPrice !== null ? t('booking.premiumHoursSummary') : null,
    ].filter(Boolean) as string[];

    const details = [
      t('booking.driverIncluded'),
      t('booking.serviceHoursSummary'),
      `${t('booking.city')}: ${t('booking.kinshasa')}`,
      t('booking.dailyCancellationSummary'),
      ...selectedOptions,
    ];

    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { paddingTop: 5, marginBottom: 20 }]}>
          {/* CAR CARD */}
          <View style={styles.carRow}>
            <Image
              source={{
                uri: recapImage,
              }}
              style={styles.carImage}
            />

            <View
              style={{ marginLeft: 10, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Text style={[styles.carName, { color: theme.text }]}>
                {selectedCar?.name ?? t('booking.noVehicle')}
              </Text>
              <Text style={{ color: theme.subText, textAlign: 'center' }}>
                {selectedCar?.category?.name ?? t('booking.categoryUnavailable')}
              </Text>

              <View style={styles.row}>
                <View style={styles.iconRow}>
                  <Ionicons name="person" size={16} color={theme.text} />
                  <Text style={{ color: theme.text, marginLeft: 5 }}>
                    {selectedCar?.seats ?? '0'}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: '#f5d7a1' }]}>
                  <Ionicons name="briefcase" size={16} color="#000" />
                  <Text style={{ marginLeft: 5 }}>{selectedCar?.baggage ?? '0'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ADDRESS */}
          <View style={[styles.box, { borderColor: theme.border }]}>
            <Text style={{ color: theme.text }}>{t('booking.address')} :</Text>
            <Text style={{ color: theme.subText, marginTop: 8 }} numberOfLines={2}>
              {locationDoc.location.description ?? t('booking.addressUnavailable')}
            </Text>
            <Text style={{ color: theme.subText, marginTop: 8 }}>{dateRangeLabel}</Text>
          </View>

          {/* DETAILS */}
          <View style={[styles.box, { borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('booking.detailsTitle')} :
            </Text>

            {details.map((item, index) => (
              <View key={index} style={styles.listRow}>
                <Ionicons name="checkmark" size={18} color="orange" />
                <Text style={{ color: theme.text, marginLeft: 8, marginRight: 8 }}>{item}</Text>
              </View>
            ))}
          </View>

          {/* COMMENT */}
          {trimmedComment ? (
            <View style={[styles.box, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text }}>{t('booking.comment')} :</Text>
              <Text style={[styles.input, { color: theme.text, backgroundColor: theme.input }]}>
                {trimmedComment}
              </Text>
            </View>
          ) : null}

          {/* ORDERED FOR */}
          {hasGuestInfo ? (
            <View style={[styles.box, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text }}>{t('booking.bookingFor')} :</Text>
              {trimmedGuestName ? (
                <Text style={[styles.input, { color: theme.text, backgroundColor: theme.input }]}>
                  {trimmedGuestName}
                </Text>
              ) : null}
              {trimmedGuestPhone ? (
                <Text style={[styles.input, { color: theme.text, backgroundColor: theme.input }]}>
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

          {/* PRICE */}
          <View style={[styles.box, { borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('booking.totalTitle')}
            </Text>

            <PriceRow
              label={`${rentalDays} ${rentalDays > 1 ? t('booking.dayPlural') : t('booking.daySingular')} ${t('booking.rentalDaysPrice')} x ${selectedCar?.priceLOC ?? 0} $ :`}
              value={` ${(selectedCar?.priceLOC && selectedCar.priceLOC * rentalDays) ?? 0} $`}
            />
            {fuel && fuelPrice !== null ? (
              <PriceRow
                label={`${t('booking.fuelFees')} :`}
                value={`${fuelPrice * rentalDays} $`}
              />
            ) : null}
            {flex && flexPrice !== null ? (
              <PriceRow
                label={`${t('booking.flexExtraHours')} :`}
                value={`${flexPrice * rentalDays} $`}
              />
            ) : null}
            {premium && premiumPrice !== null ? (
              <PriceRow
                label={`${t('booking.premiumExtraHours')} :`}
                value={`${premiumPrice * rentalDays} $`}
              />
            ) : null}
            {promoDiscountAmount > 0 ? (
              <PriceRow label={`${t('booking.discount')} :`} value={`- ${promoDiscountAmount} $`} />
            ) : null}

            <View style={styles.priceRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('booking.total')} :
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{finalTotalPrice} $</Text>
            </View>
          </View>

          {/* BUTTON */}
          {myButton()}
        </View>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 px-5 pt-4">
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
    marginBottom: 10,
  },

  addressText: {
    fontSize: 16,
    fontWeight: '500',
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
});
