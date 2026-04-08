
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import{Icon} from '@/components/ui/icon';


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

export function Airport() {
  const [value, setValue] = useState('account');

  const [rideType, setRideType] = useState<RideType>('daily');
  const [formData, setFormData] = useState<FormData>({
    location: '',
    startDate: new Date(),
    endDate: new Date(),
    showStartDatePicker: false,
    showEndDatePicker: false,
  });


  return (
    <View className='flex-1'>    
      <Text className='relative flex-1 dark:text-white text-black text-center text-2xl font-bold mt-4'>   
        Hello Airport
      </Text>
    </View>
  );        
}