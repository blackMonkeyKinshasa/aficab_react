import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LocationDoc } from '@/constants/dataInterface';
import { ResType } from '@/constants/databaseEnum';

export default function NewBooking() {
  const { doc: docParam } = useLocalSearchParams<{ doc: string }>();

  const doc: LocationDoc | null = docParam ? JSON.parse(docParam) : null;

  if (!doc) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Données manquantes</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {doc.type === ResType.LOC ? (
        <>
          <Text>Type : Location journalière</Text>
          <Text>Départ : {doc.location.description}</Text>
          <Text>Du : {new Date(doc.dateStart).toLocaleString('fr-FR')}</Text>
          <Text>Au : {new Date(doc.dateEnd).toLocaleString('fr-FR')}</Text>
        </>
      ) : (
        <>
          <Text>Type : Transfert aéroport</Text>
          <Text>Trajet : {doc.tripType === 'one-way' ? 'Aller simple' : 'Aller-retour'}</Text>
          <Text>Départ : {doc.locationDepart.description}</Text>
          <Text>Destination : {doc.locationDest.description}</Text>
          <Text>Date aller : {new Date(doc.dateStart).toLocaleString('fr-FR')}</Text>
          {doc.dateReturn && (
            <Text>Date retour : {new Date(doc.dateReturn).toLocaleString('fr-FR')}</Text>
          )}
        </>
      )}
    </View>
  );
}
