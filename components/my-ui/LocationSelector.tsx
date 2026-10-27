import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import {
  LocationSearchRow,
  LocationSearchRowContent,
  LocationSectionLabel,
} from '@/components/my-ui/LocationSearchRow';
import { LocationSearchSkeleton } from '@/components/my-ui/LocationSearchSkeleton';
import { color } from '@/constants/colors';
import { Location } from '@/constants/constants';
import { bookingSpacing } from '@/constants/spacing';
import { useAnalytics } from '@/lib/analytics';
import { useFieldThemeColors } from '@/lib/field-theme';
import { useI18n } from '@/lib/i18n';
import {
  getPlaceRowTexts,
  isKinshasaLocation,
  type PlaceRowData,
  resolveCurrentLocation,
} from '@/lib/location-utils';
import { showToast } from '@/lib/toast';
import { useMyStateLocation } from '@/store/location-state';

const SEARCH_FIELD_HEIGHT = 48;
const SEARCH_FIELD_RADIUS = 24;
/** Debounce before showing skeleton + firing Places API (ms) */
const PLACES_SEARCH_DEBOUNCE_MS = 500;

export function LocationSelector({
  onSelect,
  onQueryChange,
}: {
  onSelect: (location: Location) => void;
  onQueryChange?: (query: string) => void;
}) {
  const autocompleteRef = React.useRef<any>(null);
  const { addLocation } = useMyStateLocation();
  const analytics = useAnalytics();
  const { placesLanguage, t } = useI18n();
  const themeColors = useFieldThemeColors();

  const [searchQuery, setSearchQuery] = useState('');
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);

  const isSearching = searchQuery.trim().length >= 2;

  const handleQueryChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      onQueryChange?.(text);

      if (text.trim().length < 2) {
        setIsPlacesLoading(false);
      }
    },
    [onQueryChange]
  );

  useEffect(() => {
    if (!isSearching) {
      setIsPlacesLoading(false);
      return;
    }

    const showSkeletonTimer = setTimeout(() => {
      setIsPlacesLoading(true);
    }, PLACES_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(showSkeletonTimer);
      setIsPlacesLoading(false);
    };
  }, [searchQuery, isSearching]);

  const handleClearSearch = useCallback(() => {
    autocompleteRef.current?.clear();
    handleQueryChange('');
  }, [handleQueryChange]);

  const handleUseCurrentLocation = useCallback(async () => {
    if (isResolvingLocation) return;

    setIsResolvingLocation(true);

    try {
      const location = await resolveCurrentLocation();

      if (!location) {
        showToast({
          title: t('common.information'),
          description: t('booking.kinshasaOnlySearch'),
          action: 'info',
        });
        return;
      }

      Keyboard.dismiss();
      handleQueryChange('');
      addLocation(location);
      onSelect(location);
    } catch {
      showToast({
        title: t('common.information'),
        description: t('booking.kinshasaOnlySearch'),
        action: 'info',
      });
    } finally {
      setIsResolvingLocation(false);
    }
  }, [addLocation, handleQueryChange, isResolvingLocation, onSelect, t]);

  const stopPlacesLoading = useCallback(() => {
    setIsPlacesLoading(false);
  }, []);

  const renderPlaceRow = useCallback(
    (rowData: PlaceRowData) => {
      if (isPlacesLoading) {
        queueMicrotask(stopPlacesLoading);
      }

      const { title, subtitle } = getPlaceRowTexts(rowData);

      return (
        <View style={locationSelectorStyles.resultRow}>
          <LocationSearchRowContent
            title={title || t('booking.searchAddress')}
            subtitle={subtitle}
            icon="location"
            useThemeColors
          />
        </View>
      );
    },
    [isPlacesLoading, stopPlacesLoading, t]
  );

  const renderSearchHeader = useCallback(() => {
    if (!isSearching || isPlacesLoading) return null;
    return <LocationSectionLabel>{t('booking.searchResult')}</LocationSectionLabel>;
  }, [isPlacesLoading, isSearching, t]);

  return (
    <View
      style={{
        flex: 0,
        position: 'relative',
        zIndex: 1000,
        ...(Platform.OS === 'android' ? { elevation: 1000 } : null),
      }}>
      <GooglePlacesAutocomplete
        ref={autocompleteRef}
        placeholder={t('booking.searchAddress')}
        enablePoweredByContainer={false}
        keepResultsAfterBlur={true}
        fetchDetails={true}
        minLength={2}
        debounce={PLACES_SEARCH_DEBOUNCE_MS}
        isRowScrollable={false}
        disableScroll={true}
        listViewDisplayed="auto"
        keyboardShouldPersistTaps="always"
        renderLeftButton={() => (
          <Ionicons
            name="search"
            size={20}
            color={themeColors.placeholder}
            style={{ marginLeft: 4, marginRight: 4 }}
          />
        )}
        renderRightButton={() =>
          searchQuery.length > 0 ? (
            <Pressable
              onPress={handleClearSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close-circle" size={22} color={color.primary} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )
        }
        renderRow={(rowData) => renderPlaceRow(rowData as PlaceRowData)}
        renderHeaderComponent={renderSearchHeader}
        inbetweenCompo={
          <View>
            <LocationSearchRow
              title={t('booking.useCurrentLocation')}
              icon="navigate"
              onPress={handleUseCurrentLocation}
              trailing={
                isResolvingLocation ? (
                  <ActivityIndicator size="small" color={color.primary} />
                ) : null
              }
            />
            {isSearching ? (
              <View
                style={[locationSelectorStyles.divider, { backgroundColor: themeColors.separator }]}
              />
            ) : null}
            {isSearching && isPlacesLoading ? (
              <View className="pt-1">
                <LocationSectionLabel>{t('booking.searchResult')}</LocationSectionLabel>
                <LocationSearchSkeleton />
              </View>
            ) : null}
          </View>
        }
        listLoaderComponent={<LocationSearchSkeleton />}
        onFail={(error) => {
          stopPlacesLoading();

          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : JSON.stringify(error);

          analytics.trackGooglePlacesAutocompleteFailed({
            errorMessage,
            language: placesLanguage,
            inputLength: autocompleteRef.current?.getAddressText?.()?.length,
            queryType: 'autocomplete',
          });

          showToast({
            title: t('common.information'),
            description:
              'Google Places a echoue sur Android. Verifiez la cle API, le reseau et la restriction Places.',
            action: 'info',
          });
        }}
        onPress={(data, details = null) => {
          if (details) {
            if (!isKinshasaLocation(details, data.description)) {
              autocompleteRef.current?.clear();
              showToast({
                title: t('common.information'),
                description: t('booking.kinshasaOnlySearch'),
                action: 'info',
              });
              return;
            }

            const location: Location = {
              description: data.description,
              lat: details.geometry.location.lat,
              lng: details.geometry.location.lng,
            };
            Keyboard.dismiss();
            handleQueryChange('');
            addLocation(location);
            onSelect(location);
          }
        }}
        query={{
          key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '',
          language: placesLanguage,
          components: 'country:cd',
          location: '-4.325,15.3222',
          radius: 50000,
          strictbounds: true,
        }}
        styles={{
          container: {
            flex: 0,
            position: 'relative',
            zIndex: 1000,
          },
          textInputContainer: {
            backgroundColor: themeColors.fieldBg,
            borderRadius: SEARCH_FIELD_RADIUS,
            height: SEARCH_FIELD_HEIGHT,
            alignItems: 'center',
            paddingHorizontal: 12,
            marginBottom: bookingSpacing.fieldGap,
          },
          textInput: {
            flex: 1,
            height: SEARCH_FIELD_HEIGHT,
            marginBottom: 0,
            paddingHorizontal: 8,
            backgroundColor: 'transparent',
            borderWidth: 0,
            color: themeColors.text,
            fontSize: 16,
          },
          listView: {
            position: 'relative',
            backgroundColor: 'transparent',
            marginTop: 0,
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          },
          row: {
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
            paddingVertical: 0,
          },
          description: {
            color: themeColors.listItemText,
          },
          predefinedPlacesDescription: {
            color: themeColors.listItemSubText,
          },
          poweredContainer: {
            backgroundColor: 'transparent',
          },
          separator: {
            backgroundColor: themeColors.separator,
          },
          loader: {
            size: 'small',
            color: themeColors.loader,
          },
        }}
        textInputProps={{
          placeholder: t('booking.searchAddress'),
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: true,
          keyboardType: 'default',
          returnKeyType: 'search',
          selectionColor: color.primary,
          clearButtonMode: 'never',
          placeholderTextColor: themeColors.placeholder,
          underlineColorAndroid: 'transparent',
          onChangeText: (text: string) => {
            handleQueryChange(text);
          },
        }}
      />
    </View>
  );
}

const locationSelectorStyles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
});
