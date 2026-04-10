
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { DateField } from '@/components/my-ui/DateField';
import { ModalLocationSelector } from '@/components/my-ui/ModalLocationSelector';
import { ModuleReservation } from '@/components/my-ui/ModuleReservation';
import { Button } from '@/components/ui/button';
import { Location } from '@/constants/constants';
import { useRouter } from 'expo-router';
import { LocationDocTA } from '@/constants/dataInterface';
import { ResType } from '@/constants/databaseEnum';

type TripType = 'one-way' | 'round-trip';

const TripOption = ({
  label,
  value,
isDark,
  selected,
  onSelect,
}: {
  label: string;
  value: TripType;
  isDark: boolean;
  selected: TripType;
  onSelect: (v: TripType) => void;
}) => {
  const isSelected = selected === value;
  return (
    <TouchableOpacity
      style={styles.optionContainer}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <View style={[styles.circle, isSelected && styles.circleSelected]}>
        {isSelected && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const AIRPORT_KEYWORDS = [
  'aéroport', 'aeroport', 'airport', 'charles de gaulle', 'cdg',
  'orly', 'roissy', 'beauvais', 'le bourget',
];

function containsAirport(location: Location | null): boolean {
  if (!location) return false;
  const desc = location.description.toLowerCase();
  return AIRPORT_KEYWORDS.some((kw) => desc.includes(kw));
}

export function Airport() {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>('one-way');
  const [locationDepart, setLocationDepart] = useState<Location | null>(null);
  const [locationDest, setLocationDest] = useState<Location | null>(null);
  const [visibleDepart, setVisibleDepart] = useState(false);
  const [visibleDest, setVisibleDest] = useState(false);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateReturn, setDateReturn] = useState<Date | null>(null);
  const isDarkMode = useColorScheme() === 'dark';

  const handleSubmit = () => {
    if (!locationDepart || !locationDest || !dateStart) return;
    const doc: LocationDocTA = {
      type: ResType.TA,
      tripType,
      locationDepart,
      locationDest,
      dateStart,
      ...(tripType === 'round-trip' && dateReturn ? { dateReturn } : {}),
    };
    router.push({
      pathname: '/new_booking/[doc]',
      params: { doc: JSON.stringify(doc) },
    });
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
      ? "Au moins une des adresses doit contenir un aéroport."
      : null;

  const isValid =
    locationDepart !== null &&
    locationDest !== null &&
    dateStart !== null &&
    (tripType === 'one-way' || dateReturn !== null) &&
    airportError === null;

  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Sélecteur Aller simple / Aller retour */}
        <View style={styles.selectorContainer}>
          <TripOption label="Aller simple" value="one-way" selected={tripType} onSelect={setTripType} isDark={isDarkMode} />
          <TripOption label="Aller-retour" value="round-trip" selected={tripType} onSelect={setTripType} isDark={isDarkMode} />
        </View>

        {/* Départ */}
        <View style={{ paddingTop: 4, paddingBottom: 10, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => setVisibleDepart(true)}>
            <ModuleReservation
              icon={"location-outline"}
              title={locationDepart ? locationDepart.description : "Départ"}
              isDarkMode={isDarkMode}
            />
          </TouchableOpacity>
        </View>

        {/* Destination */}
        <View style={{ paddingTop: 4, paddingBottom: 10, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => setVisibleDest(true)}>
            <ModuleReservation
              icon={"navigate-outline"}
              title={locationDest ? locationDest.description : "Destination"}
              isDarkMode={isDarkMode}
            />
          </TouchableOpacity>
        </View>

        {/* Message d'erreur aéroport */}
        {airportError && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={{ color: '#ef4444', fontSize: 13 }}>{airportError}</Text>
          </View>
        )}

        {/* Date de départ */}
        <View style={{ paddingTop: 10, paddingBottom: 10, paddingHorizontal: 20 }}>
          <DateField
            label="Date et heure de départ"
            value={dateStart}
            minDate={new Date()}
            onChange={handleDateStartChange}
          />
        </View>

        {/* Date de retour — visible uniquement en aller retour */}
        {tripType === 'round-trip' && (
          <View style={{ paddingTop: 10, paddingBottom: 30, paddingHorizontal: 20 }}>
            <DateField
              label="Date et heure de retour"
              value={dateReturn}
              minDate={dateStart ?? new Date()}
              onChange={setDateReturn}
            />
          </View>
        )}

        {/* Bouton */}
        <TouchableOpacity
          style={{ padding: 20 }}
          disabled={!isValid}
          onPress={handleSubmit}
        >
          <Button
            disabled={!isValid}
            className="bg-orange-500 h-12 rounded-lg mb-20"
          >
            <Text className="text-white font-bold text-base">
              Voir les offres
            </Text>
          </Button>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal départ */}
      <ModalLocationSelector
        visible={visibleDepart}
        onDismiss={() => setVisibleDepart(false)}
        onConfirm={(loc) => {
          setLocationDepart(loc);
          setVisibleDepart(false);
        }}
      />

      {/* Modal destination */}
      <ModalLocationSelector
        visible={visibleDest}
        onDismiss={() => setVisibleDest(false)}
        onConfirm={(loc) => {
          setLocationDest(loc);
          setVisibleDest(false);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  selectorContainer: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    marginTop: 10,
    marginBottom: 20,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FF6A00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  circleSelected: {
    backgroundColor: '#FF6A00',
  },
  check: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    color: '#000',
  },
});