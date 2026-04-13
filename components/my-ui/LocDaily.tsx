import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Switch, Alert,
  TextInput, ScrollView , KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";
import { LocationDocLOC, Booking, Car } from "@/constants/dataInterface";
import { Button } from '@/components/ui/button';
import { Text as UIText } from '@/components/ui/text';
import { useState, useEffect, useRef } from 'react';
import { EtapeReservation, ResStatus, ResType } from "@/constants/databaseEnum";
import { Ionicons } from "@expo/vector-icons";
import { getLocCars } from "@/api/car";
import { useRouter } from 'expo-router';
import {Input} from '@/components/ui/input';
import { generateIDBooking } from '@/api/booking';


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

function formatDailyRange(locationDoc: LocationDocLOC) {
  const startDate = toDate(locationDoc.dateStart);
  const endDate = toDate(locationDoc.dateEnd);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Dates indisponibles';
  }

  const formattedStart = startDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const formattedEnd = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const diffInMs = endDate.getTime() - startDate.getTime();
  const diffInDays = Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
  const dayLabel = diffInDays > 1 ? 'jours' : 'jour';

  return `${formattedStart} au ${formattedEnd} (${diffInDays} ${dayLabel})`;
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

type CarItemProps = {
  car: Car;
  theme: Theme;
  isSelected: boolean;
  onPress: (car: Car) => void;
};

function CarItem({ car, theme, isSelected, onPress }: CarItemProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(car)}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card },
          isSelected && styles.selectedCard,
        ]}
      >
        <Text style={[styles.carName, { color: theme.text }]}>
          {car.name}
        </Text>

        <Text style={{ color: theme.subText }}>
          {car.category?.name ?? 'Sans categorie'}
        </Text>

        <View style={styles.row}>
          <View style={styles.iconRow}>
            <Ionicons name="person" size={16} color={theme.text} />
            <Text style={{ color: theme.text, marginLeft: 5 }}>
              {car.seats}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#f5d7a1" }]}>
            <Ionicons name="briefcase" size={16} color="#000" />
            <Text style={{ marginLeft: 5 }}>{car.baggage}</Text>
          </View>
        </View>

        <Image source={{ uri: car.images[0] ?? 'https://via.placeholder.com/400x240?text=Car' }} style={styles.image} />

        <Text style={styles.price}>
          $ {car.priceLOC} /Days
        </Text>
      </View>
    </TouchableOpacity>
  );
}



type Props = {
  locationDoc: LocationDocLOC
  isDarkMode: boolean
  onSubmit: (doc: Booking) => void
  etape: EtapeReservation
  setEtape: (etape: EtapeReservation) => void
};


export function LocDaily({ locationDoc, isDarkMode, onSubmit, etape, setEtape }: Props) {
  void isDarkMode;

  const theme = isDarkMode ? dark : light;
  const dateRangeLabel = formatDailyRange(locationDoc);
  const rentalDays = getRentalDays(locationDoc);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const [fuel, setFuel] = useState(true);
  const [flex, setFlex] = useState(false);
  const [premium, setPremium] = useState(false);
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingCreatedAt, setBookingCreatedAt] = useState<string | null>(null);
  const bookingIdRequestRef = useRef<Promise<string> | null>(null);
  const fuelPrice = getFuelOptionPrice(selectedCar);
  const flexPrice = getExtraTimePrice(selectedCar?.extraTime?.flex);
  const premiumPrice = getExtraTimePrice(selectedCar?.extraTime?.premium);
  const hasFuelOption = fuelPrice !== null;
  const hasFlexOption = flexPrice !== null;
  const hasPremiumOption = premiumPrice !== null;
  const hasAnyOption = hasFuelOption || hasFlexOption || hasPremiumOption;

  const getOrCreateBookingId = async () => {
    if (bookingId) {
      return bookingId;
    }

    if (!bookingIdRequestRef.current) {
      bookingIdRequestRef.current = generateIDBooking(ResType.LOC).then((generatedBookingId) => {
        if (typeof generatedBookingId !== 'string' || !generatedBookingId) {
          throw new Error('Impossible de generer un identifiant de reservation.');
        }

        setBookingId(generatedBookingId);
        setBookingCreatedAt((currentValue) => currentValue ?? new Date().toISOString());
        return generatedBookingId;
      }).finally(() => {
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
      fuel: fuel ? fuelPrice ?? 0 : 0,
      flex: flex ? flexPrice ?? 0 : 0,
      premium: premium ? premiumPrice ?? 0 : 0,
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
      total: totalPrice,
      options: selectedOptions,
      guest: trimmedGuestName || trimmedGuestPhone
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
      (fuel ? fuelPrice ?? 0 : 0) +
      (flex ? flexPrice ?? 0 : 0) +
      (premium ? premiumPrice ?? 0 : 0);

    setTotalPrice((carBasePrice + selectedOptionsTotal) * rentalDays);
  }, [selectedCar, fuel, fuelPrice, flex, flexPrice, premium, premiumPrice, rentalDays]);

  const loadCars = async (nextPage: number, replace = false) => {
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const res = await getLocCars(undefined, {
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
          Alert.alert('Information', 'Veuillez selectionner un vehicule avant de confirmer.');
          return;
        }

        onSubmit(booking);
      } catch (error) {
        Alert.alert('Erreur', error instanceof Error ? error.message : 'Generation de reservation impossible.');
      }

      return;
    }

    setEtape(NEXT_ETAPE[etape]);
  };

  const actionLabel = etape === EtapeReservation.RECAP ? 'Confirmer et payer' : 'Continuer';

  const handleCarPress = (car: Car) => {
    setSelectedCar(car);
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
    Alert.alert('Information', 'hello word');
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

  const myButton = () => {
    return (
     <View className="flex-row mt-4">        
            <Button className="h-12 w-full items-center justify-center rounded-lg bg-orange-500" 
            onPress={handleNextEtape}>
            <UIText className="text-base  font-bold text-white">
              {actionLabel}
            </UIText>
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
     <View className="flex-1 ">        
             {/* ADDRESS CARD */}
      <View style={[styles.addressCard, { backgroundColor: theme.card }]}>
        <View className="mr-2 flex-1">
          <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
            {locationDoc.location.description ?? 'Depart'}
          </Text>
          <Text style={{ color: theme.subText, marginTop: 4 }} numberOfLines={1}>
            {dateRangeLabel}
          </Text>
        </View>
        <Ionicons className="mr-1" name="pencil" size={20} color={theme.text} onPress={() => router.back()} />
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
        ListFooterComponent={isLoadingMore ? <Text style={[styles.listStateText, { color: theme.subText }]}>Chargement...</Text> : null}
        ListEmptyComponent={!isRefreshing && !isLoadingMore ? <Text style={[styles.listStateText, { color: theme.subText }]}>Aucun vehicule disponible</Text> : null}
        renderItem={({ item: car }) => (
          <CarItem car={car} theme={theme} isSelected={selectedCar?.id === car.id} onPress={handleCarPress} />
        )}
      />
      </View>
    );
  };

  const selectOption = () =>{

    return(

     <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <TouchableWithoutFeedback onPress={()=>{
        console.log("touched");
      }}>
       
       <ScrollView contentContainerStyle={{ paddingBottom: 20 }}
       showsVerticalScrollIndicator={false}
       >
      
      <View style={[styles.container]}>

      {/* OPTIONS */}
      {hasAnyOption ? (
        <View style={[styles.section, { borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>Options</Text>
          </View>

          {/* Fuel */}
          {hasFuelOption ? (
            <View style={styles.optionRow}>
              <View className="mr-3 flex-1">
                <View style={styles.optionTitleRow}>
                  <Text style={{ color: theme.text }}>Frais de carburant</Text>
                  <TouchableOpacity onPress={handleFuelInfoPress} style={styles.infoButton}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.subText} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: theme.subText, fontSize: 12 }}>
                  Couvre les frais de carburant pendant toute la duree de la location
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
                <Text style={{ color: theme.text }}>Heures supplementaires flex</Text>
                <Text style={{ color: theme.subText, fontSize: 12 }}>
                  Chauffeur disponible jusqu'a 23 h 30
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
                <Text style={{ color: theme.text }}>
                  Heures supplementaires premium
                </Text>
                <Text style={{ color: theme.subText, fontSize: 12 }}>
                  Chauffeur disponible jusqu'a l'aube
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
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
            Commentaire (optionnel)
          </Text>
         </View>

        <Input
          placeholder="Ex : Merci d'arriver 15 minutes avant..."
          placeholderTextColor={theme.subText}
          multiline
          value={comment}
          onChangeText={setComment}
          style={
            styles.input
         }
        />
      </View>

      {/* BOOKING */}
      <View style={[styles.section, { borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
            Je reserve pour une autre personne
          </Text>
         </View>

        <Input
          placeholder="Nom complet"
          placeholderTextColor={theme.subText}
          value={guestName}
          onChangeText={setGuestName}
          style={
            styles.input
            }
        />

        <Input
          placeholder="Numero de telephone"
          placeholderTextColor={theme.subText}
          value={guestPhone}
          onChangeText={setGuestPhone}
          style={
            styles.input
              }
        />
      </View>

      {/* BUTTON */}

      {myButton()}
     

    </View>

    </ScrollView>  
    
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView> 
    
      
    );
  };

  const recap = () =>{
    const recapImage = selectedCar?.images[0] ?? 'https://via.placeholder.com/400x240?text=Car';
    const trimmedComment = comment.trim();
    const trimmedGuestName = guestName.trim();
    const trimmedGuestPhone = guestPhone.trim();
    const hasGuestInfo = Boolean(trimmedGuestName || trimmedGuestPhone);
    const selectedOptions = [
      fuel && fuelPrice !== null ? `Frais de carburant: ${fuelPrice} $/jour` : null,
      flex && flexPrice !== null ? `Heures supplementaires flex: ${flexPrice} $/jour` : null,
      premium && premiumPrice !== null ? `Heures supplementaires premium: ${premiumPrice} $/jour` : null,
    ].filter(Boolean) as string[];

    const details = [
      `Vehicule: ${selectedCar?.name ?? 'Non selectionne'}`,
      `Categorie: ${selectedCar?.category?.name ?? 'Sans categorie'}`,
      `Ville: ${locationDoc.location.description ?? 'Adresse indisponible'}`,
      `Duree: ${rentalDays} ${rentalDays > 1 ? 'jours' : 'jour'}`,
      ...selectedOptions,
    ];

    return(
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      > 
      
      <View style={[styles.container, { paddingTop: 5, marginBottom: 20 }]}>
   
      {/* CAR CARD */}
      <View style={styles.carRow}>
        <Image
          source={{
            uri: recapImage,
          }}
          style={styles.carImage}
        />

        <View style={{ marginLeft: 10 }}>
          <Text style={[styles.carName, { color: theme.text }]}>
            {selectedCar?.name ?? 'Aucun vehicule'}
          </Text>
          <Text style={{ color: theme.subText }}>{selectedCar?.category?.name ?? 'Sans categorie'}</Text>

          <View style={styles.row}>
          <View style={styles.iconRow}>
            <Ionicons name="person" size={16} color={theme.text} />
            <Text style={{ color: theme.text, marginLeft: 5 }}>
              {selectedCar?.seats ?? '0'}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#f5d7a1" }]}>
            <Ionicons name="briefcase" size={16} color="#000" />
            <Text style={{ marginLeft: 5 }}>{selectedCar?.baggage ?? '0'}</Text>
          </View>
        </View>
        </View>
      </View>

      {/* ADDRESS */}
      <View style={[styles.box, { borderColor: theme.border }]}>
        <Text style={{ color: theme.text }}>Adresse :</Text>
        <Text style={{ color: theme.subText,marginTop :8 }} numberOfLines={2}>
          {locationDoc.location.description ?? 'Adresse indisponible'}
        </Text>
        <Text style={{ color: theme.subText ,marginTop :8}}>
          {dateRangeLabel}
        </Text>
      </View>

      {/* DETAILS */}
      <View style={[styles.box, { borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Details de votre reservation :
        </Text>

        {details.map((item, index) => (
          <View key={index} style={styles.listRow}>
            <Ionicons name="checkmark" size={18} color="orange" />
            <Text style={{ color: theme.text, marginLeft: 8 }}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      {/* COMMENT */}
      {trimmedComment ? (
        <View style={[styles.box, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text }}>Commentaire :</Text>
          <Text style={[styles.input, { color: theme.text, backgroundColor: theme.input }]}>
            {trimmedComment}
          </Text>
        </View>
      ) : null}

      {/* ORDERED FOR */}
      {hasGuestInfo ? (
        <View style={[styles.box, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text }}>Je reserve pour :</Text>
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

      {/* PRICE */}
      <View style={[styles.box, { borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Prix total :
        </Text>

        <PriceRow label={`${rentalDays} ${rentalDays > 1 ? 'jours' : 'jour'} de location`} value={`${selectedCar?.priceLOC ?? 0} $/jour`} />
        {fuel && fuelPrice !== null ? <PriceRow label="Frais de carburant" value={`${fuelPrice} $/jour`} /> : null}
        {flex && flexPrice !== null ? <PriceRow label="Heures supplementaires flex" value={`${flexPrice} $/jour`} /> : null}
        {premium && premiumPrice !== null ? <PriceRow label="Heures supplementaires premium" value={`${premiumPrice} $/jour`} /> : null}
        <PriceRow label="Total" value={`${totalPrice} $`} />
      </View>

      {/* BUTTON */}
      {myButton()}
    </View>
      
       </ScrollView>
    );
  };


  return (

    <View className="flex-1 px-5 pt-4">

      {etape === EtapeReservation.SELECTION &&
        selectCarsPage()}

      {etape === EtapeReservation.OPTION &&
       selectOption()}
      {etape === EtapeReservation.RECAP &&
        recap()}

    </View>
    
  );
}

const light = {
  bg: "#F1F4F8",
  card: "#f3f4f6",
  text: "#14181B",
  subText: "#6b6b6b",
  border: "#d1d5db",
  input: "#ffffff",
};

const dark = {
  bg: "#14181B",
  card: "#1E2226",
  text: "#FFFFFF",
  subText: "#A0A0A0",
  border: "#374151",
  input: "#111827",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 15,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
  },

  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },

  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  optionRight: {
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#ff5a00",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: "auto",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  addressCard: {
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  addressText: {
    fontSize: 16,
    fontWeight: "500",
  },

  card: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },

  carRow: {
    flexDirection: "row",
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
    textAlign: "center",
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
    fontWeight: "600",
    marginBottom: 10,
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  totalPriceText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
  },

  carName: {
    fontSize: 18,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "center",
    gap: 15,
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 8,
  },

  image: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 10,
  },

  price: {
    marginTop: 10,
    color: "orange",
    fontWeight: "bold",
    fontSize: 16,
  },
});