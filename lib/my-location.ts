
import { CountryCode } from 'react-native-country-picker-modal';
import { getCountryCallingCodeAsync } from 'react-native-country-picker-modal/lib/CountryService';
import * as Location from 'expo-location';


function normalizeCountryCode(countryCode: string | null | undefined): CountryCode | null {
  if (!countryCode || countryCode.length !== 2) {
    return null;
  }

  return countryCode.toUpperCase() as CountryCode;
}


export async function getUserLocationDetails() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return { city: null, country: null, countryCode: null };
    }

    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const [address] = await Location.reverseGeocodeAsync({
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
    });

    const countryCode = normalizeCountryCode(address?.isoCountryCode);
    const indicatif = countryCode ? await getCountryCallingCodeAsync(countryCode) : null;

    return {
      city: address?.city ?? address?.subregion ?? address?.region ?? null,
      country: address?.country ?? null,
      isoCountryCode: address?.isoCountryCode ?? null,
      countryCode,
      indicatif,
    };
  } catch (error) {    return { city: null, country: null, isoCountryCode: null, countryCode: null, indicatif: null };
  }
}