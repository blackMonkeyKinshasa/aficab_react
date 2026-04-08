import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardTypeOptions,
  ActivityIndicator,  
  Alert,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Camera, ChevronDown, ArrowLeft, HelpCircle } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase, } from '@/lib/supabase';
import {Avatar} from '@/components/my-ui/Avatar';  
import { DropdownField } from '@/components/my-ui/DropdownField';
import { InfoIcon } from '@/components/my-ui/InfoIcon';
import {getUserByID} from '@/api/user';
import { genderOptions } from '@/constants/constants';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/my-ui/FormField';
import {LoadingView} from '@/components/my-ui/LoadingView';
import { takePhoto,pickImageToGallery } from '@/constants/image-manager';
import { uploadAvatar } from '@/api/uploadFiles';
import { uriToBlob } from '@/constants/image-manager';
import {updateUserByID} from '@/api/user';
import {User} from '@/constants/dataInterface';





export default function EditProfile() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

 
  const [userID, setUserID] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [status, setStatus] = useState('STANDARD');
  const [initialData, setInitialData] = useState(null);
  const [update,setUpdate]=useState(false)
  const [image, setImage] = useState<string | null>(null);


  const _tableName = 'User';

  

  // Charger les données de l'utilisateur
  useEffect(() => {

    const loadUserData = async () => {
      try {
        
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
      
        if (user) {
          setEmail(user.email || '');
          getUserByID(user.id).then((data) => {
            if (data) {
              setUserID(data.id);
              setFullName(data.full_name || '');
              setPhoneNumber(data.phone_number || '');
              setGender(data.gender || '');
              setStatus(data.status || 'STANDARD');
              setInitialData(data);
              setImage(data.avatar_url || "");
              console.log(data);
            }
          }).catch((err) => {
            console.error('Erreur lors de la récupération du profil:', err);
          });

          
        }
      } catch (err) {
        console.error('Erreur lors du chargement du profil:', err);
      } finally{
        setLoading(false);
      }
   
    };

    
    loadUserData();
  
  }, []);


 

const chooseImage = () => {
  Alert.alert("Choisir une image", "Sélectionne une option", [
    { text: "Caméra", onPress: async () => {
      setImage(await takePhoto()||'');
      update || setUpdate(true);
    } },
    { text: "Galerie", onPress: async () => {
      setImage(await pickImageToGallery()||'');
      update || setUpdate(true);
    } },
    { text: "Annuler", style: "cancel" }
  ]);

};

 const handleSaveProfile = async () => {
     if (!fullName.trim()) {
       Alert.alert('Champ requis', 'Veuillez entrer votre nom et prénom.');
       return;
     }
     if (!userID) return;
 
     setLoading(true);
 
     try {
       let avatarUrl = image;
 
       if (image && !image.startsWith('http')) {
         const res = await uploadAvatar(uriToBlob(image));
         avatarUrl = res.url;
         console.log('Avatar uploadé avec succès:', res);
         supabase.auth.updateUser({ data: { avatar_url: res.url } });
         setImage(avatarUrl);
       }
 
       await updateUserByID(userID, {
         full_name: fullName,
         phone: phoneNumber.trim() || null,
         genre: gender || null,
       } as User);
 
       setLoading(false);
     } catch (err: any) {
       console.error(err);
       Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
     } finally {
       setLoading(false);
     }
   };

  return (
    <View className={`flex-1 `}>
     
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Avatar Section */}
        <View className="items-center mb-8 mt-8">
          
          <View
            className={`w-24 h-24 rounded-full items-center justify-center relative ${
              isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}
          >
            {/* User Icon */}
          <Avatar uri={image || ''} size={96} borderRadius={48} />

            {/* Camera Icon Button */}
            <TouchableOpacity
              className={`absolute bottom-0 right-0 w-10 h-10 rounded-full items-center justify-center shadow-lg bg-orange-500`}
              onPress={chooseImage}
            >
              <Camera size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          <Text
            className={`mt-4 text-sm font-bold tracking-wide ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {status}
          </Text>
        </View>

        {/* Form Section */}
        <View className="px-6">
          {/* Full Name */}
          <FormField
            label="Nom et prénom"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              console.log(fullName);
              update || setUpdate(true);
            }}
            placeholder="User 54452"
            isDark={isDark}
          />

          {/* Phone Number */}
          <FormField
            label="Numéro de téléphone"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              update || setUpdate(true);
            }}
            placeholder="+243821606126"
            keyboardType="phone-pad"
            showInfo={true}
            isDark={isDark}
            
          />

          {/* Gender */}
          <DropdownField
            label="Genre"
            value={gender}
            onSelect={(text) => {
              setGender(text);
              update || setUpdate(true);
            }}
            options={genderOptions}
            showInfo={true}
            isDark={isDark}
            showGenderDropdown={showGenderDropdown}
            setShowGenderDropdown={setShowGenderDropdown}
          />

          {/* Email (Read-only) */}
          <FormField
            label="E-mail"
            value={email}
            onChangeText={() => {}}
            placeholder="email@example.com"
            editable={false}
            isDark={isDark}
          />

          {/* Save Button */}

          {update && ( <Button
            onPress={handleSaveProfile}
            disabled={loading}
            className="bg-orange-500 h-12 rounded-lg mt-8 mb-4"
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Enregistrement...' : 'Sauvegarder les modifications'}
            </Text>
          </Button>)}
         
 

        </View>
        
      </ScrollView>
      {loading && (
        <LoadingView />
      )}
    </View>
  );
}