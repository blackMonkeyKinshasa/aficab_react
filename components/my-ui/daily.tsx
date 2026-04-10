
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
  const [value, setValue] = useState('account');
  const [visible, setVisible] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const isDarkMode = useColorScheme() === 'dark';

  const handleDateStartChange = (date: Date | null) => {
    if (!date) {
      setDateStart(null);
      return;
    }
    const minHour = new Date(date);
    minHour.setHours(8, 0, 0, 0);
    const validStart = date < minHour ? minHour : date;
    setDateStart(validStart);

    const end = new Date(validStart);
    end.setHours(20, 0, 0, 0);
    setDateEnd(end);
  };

  return (
   
    <View style={{ flex: 1, paddingTop: 8 }}>
     

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>  

            <View style={{ paddingTop: 20, paddingBottom: 10, paddingHorizontal: 20 }}>
                <TouchableOpacity onPress={()=>setVisible(true)} >
                    <ModuleReservation 
                                icon={"location-outline"}
                                title={location ? location.description : "Départ"}
                                isDarkMode={isDarkMode}
                                />

                </TouchableOpacity>

            </View>

              <View style={{ paddingTop: 10, paddingBottom: 10, paddingHorizontal: 20 }}>
              <DateField
                  label="Date et heure de début"
                  value={dateStart}
                  minDate={new Date()}
                  onChange={handleDateStartChange}
                />
            </View>


            <View style={{ paddingTop: 10, paddingBottom: 30, paddingHorizontal: 20 }}>
              <DateField
                  label="Date et heure de fin"
                  value={dateEnd}
                  minDate={dateStart && dateStart.getDay() > new Date().getDay() ? dateStart : new Date()}
                  onChange={setDateEnd}
                />
            </View>

             {/* button de l'action  */}
             <TouchableOpacity style={{ padding: 20 }} onPress={() => {
                console.log("Location:", location?.description);
                console.log("Date de début:", dateStart);
                console.log("Date de fin:", dateEnd);
              }} > 
                      <Button 
                        disabled={location === null || dateStart === null || dateEnd === null}
                        className="bg-orange-500 h-12 rounded-lg mb-6"
                          >
                            <Text className="text-white font-bold text-base ">
                              Voir les offres 
                              </Text>
                      </Button>

              </TouchableOpacity>

      </ScrollView >  

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
