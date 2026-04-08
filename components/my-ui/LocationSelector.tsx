import React from 'react';
import { View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Location } from '@/constants/constants';

export  function LocationSelector({ onSelect }: any) {
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
            backgroundColor: '#fff',
            borderColor: '#ccc',
            borderWidth: 1,
            
          },
        }}
         />
    </View>
  );
}