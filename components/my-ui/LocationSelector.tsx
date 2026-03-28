import React from 'react';
import { View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

export default function LocationSelector({ onSelect }: any) {
  return (
    <View style={{ flex: 0 }}>
      <GooglePlacesAutocomplete
        placeholder="Rechercher une adresse"
        
        fetchDetails={true}
        onPress={(data, details = null) => {
          // data = info simple
          // details = info complète (lat, lng)
          if (details) {
            const location = {
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
          components: 'country:cd', // RDC 🔥
        }}
        styles={{
          textInput: {
            height: 50,
            borderRadius: 10,
            paddingHorizontal: 10,
            backgroundColor: '#fff',
            
          },
        }}
      />
    </View>
  );
}