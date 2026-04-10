import React, { useState, useCallback } from 'react';
import {useColorScheme} from 'nativewind';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';

import { DateField } from '@/components/my-ui/DateField';

import { Ionicons } from '@expo/vector-icons';
import{Icon} from '@/components/ui/icon';
import { Daily } from '@/components/my-ui/daily';
import { Airport } from '@/components/my-ui/airport';
import { cn } from '@/lib/utils';
import Carousel from "react-native-reanimated-carousel";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';


const { width } = Dimensions.get("window");

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
    setFormData(prev => ({ ...prev, location: text }));
  }, []);

  // Gérer la date de début
  const handleStartDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setFormData(prev => ({ ...prev, showStartDatePicker: false }));
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, startDate: selectedDate }));
    }
  }, []);

  // Gérer la date/heure de fin
  const handleEndDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setFormData(prev => ({ ...prev, showEndDatePicker: false }));
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, endDate: selectedDate }));
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
    onPress,
    onSelect= false,
   
  }: {
    label: string;
    onPress: () => void;
    onSelect: boolean;
  }) => (
  <TouchableOpacity className='items-center justify-center flex-1' onPress={onPress}>

    <View className={`items-center  flex-row justify-center w-full py-2 px-4 rounded-3xl ${onSelect ? 'border-gray-400 border' : ''}`}>


       { onSelect ?  <Ionicons name={label === 'Daily' ? 'car-sport-outline' : 'airplane-outline'} size={20} color={isDark ? "#fff" : "#000"} style={{marginRight: 8}}/>
        : null }
                    
        <Text className={cn(onSelect ? 'font-bold text-base dark:text-white text-black' :  'dark:text-gray-400 text-gray-600')}>
          {label}
          </Text>

    </View>

  </TouchableOpacity>
  )


  return (

    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View className='flex-1'>

    <View className='relative flex-1 bg-gray-800 '>

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
                backgroundColor: "#04a24c",
                justifyContent: "center",
                alignItems: "center",
              }}
        >
          <Image style={{ flex: 1, width: width, height: 200,  }} source={item} />
        </View>
      )}
    />

        {/* TAB conatiner main */}
          <View className='absolute top-44  h-full w-full  bg-white dark:bg-black rounded-t-lg'>

            {/* Tabs container */}
            <View className='flex-1 items-center  mt-4' >
              
                    {/*  container header tab*/}
                    <View className='flex-row items-center justify-center mt-1 ml-4 mr-4'>

                      <TabHeader label="Daily" onPress={() => setRideType('daily')} onSelect={rideType === 'daily'} />
                        <View className='w-4' />
                      <TabHeader label="Airport" onPress={() => setRideType('airport')} onSelect={rideType === 'airport'} />

                    </View>

                    {/*  container body tab*/}
                    <View className='flex-1 w-full mt-4 ' >
                        {rideType === 'daily' ? <Daily /> : <Airport />}
                  
                    </View>
                    




            </View>


          </View>
        

        </View>


    
    </View>
     </TouchableWithoutFeedback>
  );
};

