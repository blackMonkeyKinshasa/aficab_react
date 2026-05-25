import React from 'react';
import { Text, TextProps } from 'react-native';
import { useFonts } from 'expo-font';

// Ce composant surcharge Text pour appliquer la police Montserrat par défaut
export function AppText(props: TextProps) {
  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-Italic': require('../assets/fonts/Montserrat-Italic.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    // Ajoutez d'autres variantes si besoin
  });

  if (!fontsLoaded) return null;

  return <Text {...props} style={[{ fontFamily: 'Montserrat-Regular' }, props.style]} />;
}
