import React, { ComponentProps, useCallback, useState } from 'react';
import { Dimensions, Image, Platform, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import Carousel from 'react-native-reanimated-carousel';

import { Airport } from '@/components/my-ui/airport';
import { Daily } from '@/components/my-ui/daily';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const { width } = Dimensions.get('window');

const data = [
  require('@/assets/carousele/kinvtc-hero-desktop-01.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-02.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-03.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-04.webp'),
  require('@/assets/carousele/kinvtc-hero-desktop-05.webp'),
];

interface RideBookingScreenProps {
  navigation?: any;
}

type RideType = 'daily' | 'airport';

interface FormData {
  location: string;
  startDate: Date;
  endDate: Date;
  showStartDatePicker: boolean;
  showEndDatePicker: boolean;
}

export const RideBookingScreen: React.FC<RideBookingScreenProps> = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  const [value, setValue] = useState('account');
  const [rideType, setRideType] = useState<RideType>('daily');
  const [formData, setFormData] = useState<FormData>({
    location: '',
    startDate: new Date(),
    endDate: new Date(),
    showStartDatePicker: false,
    showEndDatePicker: false,
  });
  const [date, setDate] = useState<Date | null>(null);

  // Gérer le changement de localisation
  const handleLocationChange = useCallback((text: string) => {
    setFormData((prev) => ({ ...prev, location: text }));
  }, []);

  // Gérer la date de début
  const handleStartDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setFormData((prev) => ({ ...prev, showStartDatePicker: false }));
    }
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, startDate: selectedDate }));
    }
  }, []);

  // Gérer la date/heure de fin
  const handleEndDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setFormData((prev) => ({ ...prev, showEndDatePicker: false }));
    }
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, endDate: selectedDate }));
    }
  }, []);

  // Afficher les offres
  const handleViewOffers = useCallback(() => {
    console.log('Voir les offres avec:', formData);
    // Naviguer vers la page des offres
  }, [formData]);

  // Formater la date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formater la date et heure
  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const TabHeader = ({
    label,
    iconName,
    onPress,
    onSelect = false,
  }: {
    label: string;
    iconName: ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
    onSelect: boolean;
  }) => (
    <TouchableOpacity className="flex-1 items-center justify-center" onPress={onPress}>
      <View
        className={`w-full flex-row items-center justify-center rounded-3xl px-4 py-2 ${onSelect ? 'border border-gray-400' : ''}`}>
        {onSelect ? (
          <Ionicons
            name={iconName}
            size={20}
            color={isDark ? '#fff' : '#000'}
            style={{ marginRight: 8 }}
          />
        ) : null}

        <Text
          className={cn(
            onSelect
              ? 'text-base font-bold text-black dark:text-white'
              : 'text-gray-600 dark:text-gray-400'
          )}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
      <View className="relative flex-1 bg-black">
        {/* Carrousel */}
        <Carousel
          width={width}
          height={200}
          data={data}
          autoPlay
          autoPlayInterval={3000}
          loop
          renderItem={({ item }) => (
            <View
              style={{
                flex: 1,
                backgroundColor: '#000',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Image style={{ flex: 1, width: width, height: 200 }} source={item} />
            </View>
          )}
        />

        {/* TAB conatiner main */}
        <View
          className="absolute top-44 h-full w-full rounded-t-lg bg-white dark:bg-transparent"
          style={isDark ? { backgroundColor: color.appDarkBackground } : undefined}>
          {/* Tabs container */}
          <View className="mt-4 flex-1 items-center">
            {/*  container header tab*/}
            <View className="ml-4 mr-4 mt-1 flex-row items-center justify-center">
              <TabHeader
                label={t('booking.dailyTab')}
                iconName="car-sport-outline"
                onPress={() => setRideType('daily')}
                onSelect={rideType === 'daily'}
              />
              <View className="w-4" />
              <TabHeader
                label={t('booking.airportTab')}
                iconName="airplane-outline"
                onPress={() => setRideType('airport')}
                onSelect={rideType === 'airport'}
              />
            </View>

            {/*  container body tab*/}
            <View className="mt-4 w-full flex-1">
              {rideType === 'daily' ? <Daily /> : <Airport />}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
