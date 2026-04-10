import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { RideBookingScreen } from '@/components/my-ui/RideBookingScreen';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { getUserByID, updateUserByID } from '@/api/user';
import { supabase } from '@/lib/supabase';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { FormField } from '@/components/my-ui/FormField';
import { DropdownField } from '@/components/my-ui/DropdownField';
import { Avatar } from '@/components/my-ui/Avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Camera } from 'lucide-react-native';
import { genderOptions } from '@/constants/constants';
import { takePhoto, pickImageToGallery, uriToBlob } from '@/constants/image-manager';
import {User} from '@/constants/dataInterface';
import { uploadAvatar } from '@/api/uploadFiles';
import { he } from 'react-native-paper-dates';

const SCREEN_OPTIONS = (title: string,  isDark: boolean, onPress: () => void) => ({
 title: '',
  headerTransparent: false,
  headerRight: () => <NotificationIcon isDark={isDark} onPress={onPress} />,
  headerLeft: () => <Image source={isDark ? require('@/assets/images/aficab-logo-white.png') : require('@/assets/images/aficab-logo-black.png')}
   style={{ width: 90, height: 30, resizeMode: 'contain', marginLeft: 10 }} />, 
});

const _tableName = 'User';

export default function App() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar_url, setAvatarUrl] = useState('');
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [genre, setGenre] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          console.log('user', user.id);
          setUserId(user.id ?? '');
          getUserByID(user.id)
            .then((data) => {
              if (data) {
                setImage(data.avatar_url ?? null);
                setPhone(data.phone ?? '');
                setGenre(data.genre ?? '');
                setEmail(data.email ?? '');
                setId(data.id ?? '');
                if (!data.full_name) {
                  setShowProfileModal(true);
                } else {
                  setFullName(data.full_name);
                }
              }
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {}/*setLoading(false)*/);
  }, []);

  const chooseImage = () => {
    Alert.alert('Choisir une image', 'Sélectionne une option', [
      { text: 'Caméra', onPress: async () => setImage((await takePhoto()) || '') },
      { text: 'Galerie', onPress: async () => setImage((await pickImageToGallery()) || '') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Champ requis', 'Veuillez entrer votre nom et prénom.');
      return;
    }
    if (!userId) return;

    setSaving(true);

    try {
      let avatarUrl = avatar_url;

      if (image && !image.startsWith('http')) {
        const res = await uploadAvatar(uriToBlob(image));
        avatarUrl = res.url;
        console.log('Avatar uploadé avec succès:', res);
        supabase.auth.updateUser({ data: { avatar_url: res.url } });
        setAvatarUrl(avatarUrl);
      }

      await updateUserByID(userId, {
        full_name: fullName,
        phone: phone.trim() || null,
        genre: genre || null,
      } as User);

      setShowProfileModal(false);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const bg = isDark ? '#000' : '#f2f2f7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const fg = isDark ? '#fff' : '#000';
  const sub = isDark ? '#aaa' : '#666';

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS('Accueil', isDark, () => router.push('/notificationsPage'))} />
     
      <View style={{ flex: 1 }}>
       
      <RideBookingScreen />

       </View>
      {loading && <LoadingView />}

      {/* Profile completion modal */}
      <Modal visible={showProfileModal} animationType="slide" onRequestClose={() => {}}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title */}
            <Text style={[styles.modalTitle, { color: fg }]}>Complétez votre profil</Text>
            <Text style={[styles.modalSubtitle, { color: sub }]}>
              Dites-nous comment vous appeler pour continuer.
            </Text>

            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0' }]}>
                <Avatar uri={image || ''} size={96} borderRadius={48} />
                <TouchableOpacity style={styles.cameraBtn} onPress={chooseImage}>
                  <Camera size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Form */}
            <View style={styles.formWrapper}>
              <FormField
                label="Nom et prénom *"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jean Dupont"
                isDark={isDark}
              />
              <FormField
                label="Numéro de téléphone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+243821606126"
                keyboardType="phone-pad"
                showInfo={true}
                isDark={isDark}
              />
              <DropdownField
                label="Genre"
                value={genre}
                onSelect={setGenre}
                options={genderOptions}
                showInfo={true}
                isDark={isDark}
                showGenderDropdown={showGenderDropdown}
                setShowGenderDropdown={setShowGenderDropdown}
              />

              <Button
                onPress={handleSaveProfile}
                disabled={saving}
                className="bg-orange-500 h-12 rounded-lg mt-8 mb-4"
              >
                <Text className="text-white font-bold text-base">
                  {saving ? 'Enregistrement...' : 'Continuer'}
                </Text>
              </Button>
            </View>
          </ScrollView>
          {saving && <LoadingView />}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 60, marginBottom: 6, paddingHorizontal: 24 },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 32 },
  avatarWrapper: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  formWrapper: { paddingHorizontal: 24 },
});
