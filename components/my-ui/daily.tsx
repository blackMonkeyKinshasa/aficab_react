
import React, { useState, useCallback } from 'react';
import { Snackbar } from 'react-native-paper';
import {
  View,
  Text,
  Image,
  Linking,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { DateField } from '@/components/my-ui/DateField';
import { Ionicons } from '@expo/vector-icons';
import{Icon} from '@/components/ui/icon';
import {Input} from '@/components/ui/input';
import {LocationSelector} from './LocationSelector';
import {ModalLocationSelector} from '@/components/my-ui/ModalLocationSelector';
import {ModuleReservation} from '@/components/my-ui/ModuleReservation';
import { Button } from '@/components/ui/button';
import { Location } from '@/constants/constants';
import { useRouter } from 'expo-router';
import { LocationDocLOC } from '@/constants/dataInterface';
import { ResType, SUPPORT_EMAIL_URL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/constants/databaseEnum';
import * as Sentry from '@sentry/react-native';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { useMyStateUser } from '@/store/user-state';
import { Alert } from 'react-native';

interface RideBookingScreenProps {
  navigation?: any;
}


type RideType = 'daily' | 'airport';

const formatDate = (d: Date | null) => {
  if (!d) return "";

  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function Daily() {
  const router = useRouter();
  const { t } = useI18n();
  const [value, setValue] = useState('account');
  const [visible, setVisible] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [hasEarlyStartSelection, setHasEarlyStartSelection] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const analytics = useAnalytics();
  const userPhone = useMyStateUser((state) => state.user?.phone?.trim() ?? '');
  const hasLateEndSelection =
    dateEnd !== null && (dateEnd.getHours() > 20 || (dateEnd.getHours() === 20 && dateEnd.getMinutes() > 0));
  const showStandardHoursInfo = hasEarlyStartSelection || hasLateEndSelection;

  const handleSubmit = () => {
    if (!location || !dateStart || !dateEnd) return;

    if (!userPhone) {
      Alert.alert(
        t('booking.phoneRequiredTitle'),
        t('booking.phoneRequiredMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('booking.addNow'),
            onPress: () =>
              router.push({
                pathname: '/edit-profile',
                params: { focusField: 'phone', returnToBooking: '1' },
              }),
          },
        ]
      );
      return;
    }

    const doc: LocationDocLOC = {
      type: ResType.LOC,
      location,
      dateStart,
      dateEnd,
    };
    analytics.trackBookingStarted(ResType.LOC, {
      origin: location.description,
      dateStart: dateStart.toISOString(),
      dateEnd: dateEnd.toISOString(),
    });
    router.push({
      pathname: '/new_booking/[doc]',
      params: { doc: JSON.stringify(doc) },
    });


  };

  const handleDateStartChange = (date: Date | null) => {
    if (!date) {
      setDateStart(null);
      setHasEarlyStartSelection(false);
      return;
    }
    const minHour = new Date(date);
    minHour.setHours(8, 0, 0, 0);
    setHasEarlyStartSelection(date < minHour);
    const validStart = date < minHour ? minHour : date;
    setDateStart(validStart);

    const end = new Date(validStart);
    end.setHours(20, 0, 0, 0);
    setDateEnd(end);
  };

  const handleDateEndChange = (date: Date | null) => {
    setDateEnd(date);
  };

  return (
   
    <View style={{ flex: 1, paddingTop: 8 }}>
     

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>

            <View style={{ paddingTop: 20, paddingBottom: 10, paddingHorizontal: 20 }}>
                <TouchableOpacity onPress={()=>setVisible(true)} >
                    <ModuleReservation 
                                icon={"location-outline"}
                                title={location ? location.description : t('booking.departure')}
                                isDarkMode={isDarkMode}
                                />

                </TouchableOpacity>

            </View>

              <View style={{ paddingTop: 10, paddingBottom: 10, paddingHorizontal: 20 }}>
              <DateField
                  label={t('booking.startDateTime')}
                  value={dateStart}
                  minDate={new Date()}
                  onChange={handleDateStartChange}
                  isStartTime={true}
                />
            </View>


            <View style={{ paddingTop: 10, paddingBottom: 30, paddingHorizontal: 20 }}>
              <DateField
                  label={t('booking.endDateTime')}
                  value={dateEnd}
                  minDate={dateStart && dateStart.getDay() > new Date().getDay() ? dateStart : new Date()}
                  onChange={handleDateEndChange}
                  isStartTime={false}
                />
            </View>
             {/* button de l'action  */}
             <TouchableOpacity style={{ padding: 20 }} > 
                      <Button 
                        disabled={location === null || dateStart === null || dateEnd === null}
                        className="bg-orange-500 h-12 rounded-lg mb-6"
                        onPress={handleSubmit}
                          >
                            <Text className="text-white font-bold text-base ">
                              {t('booking.viewOffers')} →
                              </Text>
                      </Button>

              </TouchableOpacity>

           
      </ScrollView >  

      <Snackbar
      style={{ marginBottom: 150 }}
        visible={showStandardHoursInfo}
        duration={Snackbar.DURATION_SHORT}
        onDismiss={() => { }}
        action={{
          label: 'OK',
          onPress: () => {
            setHasEarlyStartSelection(false)
          },
        
        }}>
       {t('booking.standardHoursInfo')}
      </Snackbar>

        {/*fenetre modal pour la selection du lieu*/}
        <ModalLocationSelector
          visible = {visible}
          onDismiss = {()=>setVisible(false)}
          onConfirm = {(newLocation)=>{
            console.log("Location confirmée:", newLocation.description);
            setLocation(newLocation);
            setVisible(false);
          }}
        />
    


 </View>  );        
}
