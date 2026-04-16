import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  View,
  useColorScheme,
} from 'react-native'

import { Button, IconButton, useTheme } from 'react-native-paper'
import { memo, useCallback, useEffect, useState } from 'react'
import {color} from '@/constants/colors';
import {LocationSelector} from './LocationSelector';
import { Location } from '@/constants/constants';
import { useMyStateLocation } from '@/constants/my-state';

export function ModalLocationSelector({
  visible,
  onDismiss,
  onConfirm,
}: {
 
  visible: boolean | undefined
  onDismiss: () => any
  onConfirm: (location: Location) => void
}) {
  const theme = useTheme()
  const isDark = useColorScheme() === 'dark';
  const modalBg = isDark ? '#1E2226' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subTextColor = isDark ? '#A0A0A0' : '#555555';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  const [location, setLocation] = useState<Location | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const {recentLocations, removeLocation} = useMyStateLocation();

 


  const color = theme.dark
    ? theme.colors.elevation.level3
    : theme.colors.surface

  return (
    <Modal
      animationType={"slide"}
      transparent={false}
      visible={visible}
      onRequestClose={onDismiss}
      presentationStyle="formSheet"
      statusBarTranslucent={false}
      

    >
      <>
      
        <View style={{ flex: 1, backgroundColor: modalBg }}>

          {/* Header */}
           <View style={{ padding: 4, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: borderColor }}>

                  <View className='flex-1 flex-row items-center'>
                  

                   <View className='flex-1 items-start justify-end ml-4' >
                        
                          <IconButton
                              icon={'close'}
                              size={24}
                              iconColor={textColor}
                              onPress={() => {
                                onDismiss()
                              }}
                    />

                    </View>
                   
                    <View className='flex-1 items-end justify-end  mr-4' >
                        
                          <TouchableOpacity onPress={() => {
                          if (location) {
                            onConfirm(location);
                          }
                            }}>
                          
                          <Text style={{ fontSize: 18, fontWeight: '400', color: textColor }}>Save</Text>

                        </TouchableOpacity>

                    </View>
                   

                </View>
          </View>


          {/* body */}
          <View className=' flex-row items-center'>
                <View style={{ flex: 1, paddingTop: 8 }}>
                      <View style={{ zIndex: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
                        <LocationSelector onSelect={(location)=>{
                          setLocation(location);
                          onConfirm(location);
                        }} />
                      </View>

                       <View style={{ zIndex: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
                        <FlatList
                          data={recentLocations}
                          keyExtractor={(recentLocations) => recentLocations.description}
                          showsVerticalScrollIndicator={false}
                          renderItem={({ item: loc }) => (
                          <TouchableOpacity onPress={() => {
                            setLocation(loc);
                            onConfirm(loc);
                          }}>
                            <View className='flex-row ' >
                              
                            <Text style={{ marginTop: 16, flex: 1, color: subTextColor }}>
                            📍 {loc.description}
                            </Text>

                            <IconButton icon={'close'} size={20} iconColor={'#999'} onPress={() => {
                              removeLocation(loc);
                            }} />


                            </View >
                            
                          </TouchableOpacity>
                        )}  
                        
                        />
                      </View>
                     

                </View>
           </View>

        </View>
      </>
    </Modal>
  )
}