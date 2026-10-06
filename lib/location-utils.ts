import * as Location from 'expo-location';

import { reverseGeocode } from '@/api/googlePlaces';
import type { Location as AppLocation } from '@/constants/constants';

export const KINSHASA_KEYWORD = 'kinshasa';

function extractPlaceText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (value && typeof value === 'object' && 'text' in value) {
    const nestedText = (value as { text?: unknown }).text;
    if (typeof nestedText === 'string') {
      const trimmed = nestedText.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
  }

  return undefined;
}

export type PlaceRowData = {
  description?: string;
  name?: string;
  formatted_address?: string;
  vicinity?: string;
  terms?: { value?: string }[];
  structured_formatting?: {
    main_text?: unknown;
    secondary_text?: unknown;
  };
};

export function getPlaceRowTexts(rowData: PlaceRowData) {
  const formatting = rowData.structured_formatting;

  let title =
    extractPlaceText(formatting?.main_text) ??
    extractPlaceText(rowData.description) ??
    extractPlaceText(rowData.name) ??
    extractPlaceText(rowData.formatted_address) ??
    extractPlaceText(rowData.vicinity) ??
    '';

  if (!title && Array.isArray(rowData.terms) && rowData.terms.length > 0) {
    title = rowData.terms
      .map((term) => term?.value?.trim())
      .filter((value): value is string => !!value)
      .join(', ');
  }

  let subtitle = extractPlaceText(formatting?.secondary_text);

  if (title && subtitle === title) {
    subtitle = undefined;
  }

  if (!subtitle && title && rowData.description) {
    const description = extractPlaceText(rowData.description);
    if (description && description !== title) {
      subtitle = description;
    }
  }

  return { title, subtitle };
}

export function getAddressName(description?: string | null, fallback = ''): string {
  const value = description?.trim() ?? '';
  if (!value) return fallback;
  return value.split(',')[0]?.trim() || value;
}

export function isKinshasaLocation(details: unknown, description?: string) {
  const detailsRecord = details as Record<string, unknown> | null | undefined;
  const addressComponents = detailsRecord?.address_components;

  const addressParts = Array.isArray(addressComponents)
    ? addressComponents.flatMap((component) => {
        const part = component as Record<string, unknown>;
        return [part?.long_name, part?.short_name];
      })
    : [];

  const searchableParts = [
    description,
    detailsRecord?.formatted_address,
    detailsRecord?.name,
    detailsRecord?.vicinity,
    ...addressParts,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  return searchableParts.some((value) => value.includes(KINSHASA_KEYWORD));
}

export async function resolveCurrentLocation(): Promise<AppLocation | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    return null;
  }

  const currentPosition = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = currentPosition.coords;
  const latLng = `${latitude},${longitude}`;

  const geocodeResponse = await reverseGeocode(latLng);
  const result = geocodeResponse?.results?.[0];

  if (!result) {
    return null;
  }

  const description = result.formatted_address as string | undefined;

  if (!description || !isKinshasaLocation(result, description)) {
    return null;
  }

  const location = result.geometry?.location;

  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }

  return {
    description,
    lat: location.lat,
    lng: location.lng,
  };
}
