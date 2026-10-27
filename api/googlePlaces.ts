const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';

function googleFetch(url: string) {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
      return res.json();
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
}

function requireGoogleApiKey() {
  if (!GOOGLE_API_KEY) {
    throw new Error(
      'Clé Google Maps manquante. Définissez EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.'
    );
  }
}

// GET places:autocomplete (Google Places API v1)
export function searchGooglePlaces(query: string) {
  requireGoogleApiKey();
  const url = `https://places.googleapis.com/v1/places:autocomplete?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&language=fr&components=country:cd`;
  return googleFetch(url);
}

// GET /place/details/json — geocodage par place_id
export function getGoogleGeocode(placeId: string) {
  requireGoogleApiKey();
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${GOOGLE_API_KEY}`;
  return googleFetch(url);
}

// GET /geocode/json — geocodage inverse par lat/lng
export function reverseGeocode(latLng: string) {
  requireGoogleApiKey();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(latLng)}&key=${GOOGLE_API_KEY}`;
  return googleFetch(url);
}
