import React, { useState } from 'react';
import { View, Text } from 'react-native';
import LocationSelector from './LocationSelector';
import {Location} from '@/constants/dataType';

export default function ReservationScreen() {

  const [location, setLocation] = useState<Location | null>(null);

  return (
    <View style={{ padding: 20 }}>
      <LocationSelector onSelect={setLocation} />

      {location && (
        <Text>
          📍 {location.description}
        </Text>
      )}
    </View>
  );
}