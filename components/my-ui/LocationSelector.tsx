import React from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Text, View, useColorScheme } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Location } from '@/constants/constants';
import { useMyStateLocation } from '@/store/location-state';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';

const KINSHASA_KEYWORD = 'kinshasa';

function isKinshasaLocation(details: any, description?: string) {
  const addressParts = Array.isArray(details?.address_components)
    ? details.address_components.flatMap((component: any) => [component?.long_name, component?.short_name])
    : [];

  const searchableParts = [
    description,
    details?.formatted_address,
    details?.name,
    details?.vicinity,
    ...addressParts,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  return searchableParts.some((value) => value.includes(KINSHASA_KEYWORD));
}

export  function LocationSelector({
  onSelect,
  onQueryChange,
}: {
  onSelect: (location: Location) => void;
  onQueryChange?: (query: string) => void;
}) {
  const autocompleteRef = React.useRef<any>(null);
  const {addLocation} = useMyStateLocation();
  const analytics = useAnalytics();
  const { placesLanguage, t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const inputBg = isDark ? '#111827' : '#ffffff';
  const inputBorder = isDark ? '#374151' : '#cccccc';
  const inputText = isDark ? '#ffffff' : '#000000';
  const placeholderText = isDark ? '#6b7280' : '#999999';
  const listBg = isDark ? '#1E2226' : '#ffffff';
  const listItemText = isDark ? '#ffffff' : '#000000';
  const listItemSubText = isDark ? '#A0A0A0' : '#555555';
  const separatorBg = isDark ? '#374151' : '#e5e7eb';
  const loaderColor = isDark ? '#ffffff' : '#111827';

  return (
    <View
      style={{
        flex: 0,
        position: 'relative',
        zIndex: 1000,
        ...(Platform.OS === 'android' ? { elevation: 1000 } : null),
      }}
    >
      <GooglePlacesAutocomplete
        ref={autocompleteRef}
        placeholder={t('booking.searchAddress')}
        enablePoweredByContainer={false}
        keepResultsAfterBlur={true}
        fetchDetails={true}
        minLength={2}
        debounce={250}
        disableScroll={false}
        listViewDisplayed="auto"
        keyboardShouldPersistTaps='always'
        listLoaderComponent={
          <View
            style={{
              backgroundColor: listBg,
              paddingHorizontal: 12,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ActivityIndicator size="small" color={loaderColor} />
            <Text style={{ color: listItemText }}>{t('booking.loading')}</Text>
          </View>
        }
        onFail={(error) => {
          const errorMessage = error instanceof Error
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

          Alert.alert(t('common.information'), 'Google Places a echoue sur Android. Verifiez la cle API, le reseau et la restriction Places.');
        }}
        onPress={(data, details = null) => {
          if (details) {
            if (!isKinshasaLocation(details, data.description)) {
              autocompleteRef.current?.clear();
              Alert.alert(t('common.information'), t('booking.kinshasaOnlySearch'));
              return;
            }

            const location: Location = {
              description: data.description,
              lat: details.geometry.location.lat,
              lng: details.geometry.location.lng,
            };
            Keyboard.dismiss();
            onQueryChange?.('');
            addLocation(location);
            onSelect(location);
          }
        }}
        query={{
          key: 'AIzaSyD_1-Bzu8tGciu7Z5-QJWYMapflwCEWB3o',
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
            backgroundColor: 'transparent',
          },
          textInput: {
            height: 45,
            borderRadius: 10,
            paddingHorizontal: 10,
            backgroundColor: inputBg,
            borderColor: inputBorder,
            borderWidth: 1,
            color: inputText,
          },
          listView: {
            position: 'absolute',
            top: 49,
            left: 0,
            right: 0,
            backgroundColor: listBg,
            color: listItemText,
            borderRadius: 10,
            overflow: 'hidden',
            marginTop: 4,
            borderWidth: 1,
            borderColor: separatorBg,
            shadowColor: '#000000',
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
  
            elevation: 1001,
             
          },
          row: {
            backgroundColor: listBg,
            paddingHorizontal: 12,
            paddingVertical: 10,
          },
          description: {
            color: listItemText,
          },
          predefinedPlacesDescription: {
            color: listItemSubText,
          },
          poweredContainer: {
            backgroundColor: listBg,
          },
        
          separator: {
            backgroundColor: separatorBg,
          },

          loader: {
           size:"small",
           color:loaderColor
          },

        }}

        textInputProps={{
          placeholder: t('booking.searchAddress'),
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: true,
          keyboardType: 'default',
          returnKeyType: 'search',
          selectionColor: inputText,
          clearButtonMode: 'always',
          placeholderTextColor: placeholderText,
          underlineColorAndroid: 'transparent',
          backgroundColor: inputBg,
          onChangeText: (text: string) => {
            onQueryChange?.(text);
          },
        }}
         />
    </View>
  );
}
