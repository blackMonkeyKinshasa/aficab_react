import React from 'react';
import { View, Keyboard, TouchableWithoutFeedback, useColorScheme } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Location } from '@/constants/constants';
import { useMyStateLocation } from '@/constants/my-state';

export  function LocationSelector({ onSelect }: {onSelect: (location: Location) => void}) {
  const {addLocation} = useMyStateLocation();
  const isDark = useColorScheme() === 'dark';
  const inputBg = isDark ? '#111827' : '#ffffff';
  const inputBorder = isDark ? '#374151' : '#cccccc';
  const inputText = isDark ? '#ffffff' : '#000000';
  const placeholderText = isDark ? '#6b7280' : '#999999';
  const listBg = isDark ? '#1E2226' : '#ffffff';
  const listItemText = isDark ? '#ffffff' : '#000000';
  const listItemSubText = isDark ? '#A0A0A0' : '#555555';
  const separatorBg = isDark ? '#374151' : '#e5e7eb';

  return (
    <View style={{ flex: 0 }} >
      <GooglePlacesAutocomplete
        placeholder="Rechercher une adresse"
        fetchDetails={true}
        disableScroll={false}
        keyboardShouldPersistTaps='always'
        onPress={(data, details = null) => {
          if (details) {
            const location: Location = {
              description: data.description,
              lat: details.geometry.location.lat,
              lng: details.geometry.location.lng,
            };
            addLocation(location);
            onSelect(location);
          }
        }}
        query={{
          key: 'AIzaSyD_1-Bzu8tGciu7Z5-QJWYMapflwCEWB3o',
          language: 'fr',
          components: 'country:cd',
        }}
        styles={{
          container: { flex: 0 },
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
            backgroundColor: listBg,
            borderRadius: 10,
            marginTop: 4,
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
          separator: {
            backgroundColor: separatorBg,
          },
        }}

        textInputProps={{
          placeholder: 'Rechercher une adresse',
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
        }}
         />
    </View>
  );
}
