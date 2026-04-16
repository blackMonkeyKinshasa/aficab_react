
import { View, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { HeaderBackButton } from '@react-navigation/elements';
import { LocationDoc, LocationDocLOC, LocationDocTA } from '@/constants/dataInterface';
import { EtapeReservation, ResType } from '@/constants/databaseEnum';
import { useState } from 'react';
import { LocAirport } from '@/components/my-ui/LocAirport';
import { LocDaily } from '@/components/my-ui/LocDaily';
import { Booking } from '@/constants/dataInterface';
import { useColorScheme } from 'react-native';
import {PaymentModal} from '@/components/my-ui/PaymentModal';
 

const ETAPE_TITLES: Record<EtapeReservation, string> = {
  [EtapeReservation.SELECTION]: "Selection d'un vehicule",
  [EtapeReservation.OPTION]: 'Options de selection',
  [EtapeReservation.RECAP]: 'Recapitulatif',
};

const PREVIOUS_ETAPE: Record<EtapeReservation, EtapeReservation> = {
  [EtapeReservation.SELECTION]: EtapeReservation.SELECTION,
  [EtapeReservation.OPTION]: EtapeReservation.SELECTION,
  [EtapeReservation.RECAP]: EtapeReservation.OPTION,
};

const SCREEN_OPTIONS = (title: string, isDark: boolean, onPress: () => void) => ({
 title,
  headerTransparent: false,
  headerLeft: () => <HeaderBackButton tintColor={isDark ? '#FFFFFF' : '#000000'} onPress={onPress} />,
  headerBackTitle: 'Retour',
});


export default function NewBooking() {

  const router = useRouter();
  const { doc: docParam } = useLocalSearchParams<{ doc: string }>();
  const doc: LocationDoc | null = docParam ? JSON.parse(docParam) : null;

  const isDarkMode = useColorScheme() === 'dark';
  const [etape, setEtape] = useState<EtapeReservation>(EtapeReservation.SELECTION);
  const title = ETAPE_TITLES[etape];
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const onSubmit = (doc: Booking) => {
    console.log(doc);
    setPaymentModalVisible(true);
  };

  const handleHeaderBackPress = () => {
    if (etape !== EtapeReservation.SELECTION) {
      setEtape(PREVIOUS_ETAPE[etape]);
      return;
    }

    router.back();
  };

  if (!doc) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Données manquantes</Text>
      </View>
    );
  }

  return (

    <><Stack.Screen options={{ ...SCREEN_OPTIONS(title, isDarkMode, handleHeaderBackPress), headerShown: true }} />     
    <View style={{ flex: 1 }}>
      {doc.type === ResType.LOC ? (
        <>
          <LocDaily locationDoc={doc as LocationDocLOC} isDarkMode={isDarkMode} onSubmit={onSubmit} etape={etape} setEtape={setEtape} />
        </>
      ) : (
        <>
          <LocAirport locationDoc={doc as LocationDocTA} isDarkMode={isDarkMode} onSubmit={onSubmit} etape={etape} setEtape={setEtape} />
        </>
      )}
    </View>

    <PaymentModal visible={paymentModalVisible} onClose={() => setPaymentModalVisible(false)} />
      
    </>
  );
}
