import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'

import { Button, IconButton, useTheme } from 'react-native-paper'
import { memo, useCallback, useEffect, useState } from 'react'
import {color} from '@/constants/colors';
import {LocationSelector} from './LocationSelector';
import { Location } from '@/constants/constants';

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

  const [location, setLocation] = useState<Location | null>(null);
  const [date, setDate] = useState<Date | null>(null);

 


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
      
        <View className='flex-1 '>

          {/* Header */}
           <View className='p-1 flex-row '>

                  <View className='flex-1 flex-row items-center'>
                  

                   <View className='flex-1 items-start justify-end ml-4' >
                        
                          <IconButton
                              icon={'close'}
                              size={24}
                              iconColor={'#000'}
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
                          
                          <Text className='text-lg font-normal' >Save</Text>

                        </TouchableOpacity>

                    </View>
                   

                </View>
          </View>


          {/* body */}
          <View className=' flex-row items-center'>
                <View style={{ flex: 1, paddingTop: 8 }}>
                      <View style={{ zIndex: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
                        <LocationSelector onSelect={setLocation} />
                      </View>
                      {!!location && (
                        <Text style={{ marginTop: 8, marginHorizontal: 16 }}>
                          📍 {location.description}
                        </Text>
                      )}

                </View>
           </View>

        </View>
      </>
    </Modal>
  )
}