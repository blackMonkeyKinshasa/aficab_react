import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { uploadAvatar } from '@/api/uploadFiles';
import { getUserByID, updateUserByID } from '@/api/user';
import { Avatar } from '@/components/my-ui/Avatar';
import { FormField } from '@/components/my-ui/FormField';
import { InfoIcon } from '@/components/my-ui/InfoIcon';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { Button, ButtonText } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { genderOptions } from '@/constants/constants';
import { User } from '@/constants/dataInterface';
import { pickImageToGallery, takePhoto, uriToBlob } from '@/constants/image-manager';
import { useI18n } from '@/lib/i18n';
import { getUserLocationDetails } from '@/lib/my-location';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { useMyStateUser, type UserState } from '@/store/user-state';

export default function CreateProfile() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const storedUser = useMyStateUser((state: UserState) => state.user);
  const setStoredUser = useMyStateUser((state: UserState) => state.setUser);
  const clearStoredUser = useMyStateUser((state: UserState) => state.clearUser);
  const { t } = useI18n();
  const toast = useAppToast();
  const localizedGenderOptions = genderOptions.map((option) => ({
    ...option,
    label: option.value === 'male' ? t('profile.genderMale') : t('profile.genderFemale'),
  }));

  const hydrateForm = (data: User) => {
    setFullName(data.full_name ?? '');
    setPhoneNumber(data.phone ?? '');
    setGender(data.genre ?? '');
    setImage(data.avatar_url ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    const loadUserProfile = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          clearStoredUser();
          router.replace('/(auth)/login');
          return;
        }

        void getUserLocationDetails();

        if (!isMounted) {
          return;
        }

        if (storedUser?.id === user.id) {
          hydrateForm(storedUser);
          return;
        }

        const data = await getUserByID(user.id);

        if (!isMounted || !data) {
          return;
        }

        setStoredUser(data);
        hydrateForm(data);
      } catch {
        // console.error('Erreur lors du chargement du profil:', error);
        // Alert.alert('Erreur', error?.message ?? 'Impossible de charger votre profil.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, [clearStoredUser, router, setStoredUser, storedUser]);

  const chooseImage = () => {
    Alert.alert(t('profile.selectImageTitle'), t('profile.selectImageMessage'), [
      { text: t('profile.camera'), onPress: async () => setImage((await takePhoto()) || '') },
      {
        text: t('profile.gallery'),
        onPress: async () => setImage((await pickImageToGallery()) || ''),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast({
        title: t('profile.requiredTitle'),
        description: t('profile.fullNameRequired'),
        action: 'error',
      });
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        clearStoredUser();
        router.replace('/(auth)/login');
        return;
      }

      let avatarUrl = image ?? null;

      if (image && !image.startsWith('http')) {
        const upload = await uploadAvatar(await uriToBlob(image));
        avatarUrl = upload.url;
        setImage(upload.url);
      }

      const locationDetails = await getUserLocationDetails();
      const city = locationDetails.city ?? storedUser?.city ?? null;
      const country = locationDetails.country ?? storedUser?.country ?? null;

      await updateUserByID(user.id, {
        full_name: fullName.trim(),
        phone: phoneNumber.trim() || null,
        genre: gender || null,
        avatar_url: avatarUrl || null,
        city,
        country,
      } as User);

      const refreshedUser = await getUserByID(user.id);

      setStoredUser(refreshedUser);
      hydrateForm(refreshedUser);
      router.replace('/');
    } catch (error: any) {
      if (error.code === 'DUPLICATE_ENTRY') {
        toast({
          title: t('profile.duplicatePhoneTitle'),
          description: t('profile.duplicatePhoneMessage'),
          action: 'warning',
        });
        return;
      }

      console.error(error);
      toast({
        title: t('common.error'),
        description: error?.message ?? t('profile.genericErrorMessage'),
        action: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const bg = isDark ? '#000' : '#f2f2f7';
  const fg = isDark ? '#fff' : '#000';
  const sub = isDark ? '#aaa' : '#666';

  return (
    <>
      <Stack.Screen options={{ title: '', headerBackVisible: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.modalTitle, { color: fg }]}>{t('profile.createTitle')}</Text>
          <Text style={[styles.modalSubtitle, { color: sub }]}>{t('profile.createSubtitle')}</Text>

          <View style={styles.avatarWrapper}>
            <View
              style={[styles.avatarContainer, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0' }]}>
              <Avatar uri={image || ''} size={96} borderRadius={48} isDark={isDark} />
              <TouchableOpacity style={styles.cameraBtn} onPress={chooseImage}>
                <Camera size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formWrapper}>
            <FormField
              label={t('profile.fullNameRequiredLabel')}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jean Dupont"
            />

            <FormField
              label={t('profile.phoneNumber')}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+243821606126"
              keyboardType="phone-pad"
              showInfo={true}
            />

            <View className="mb-6">
              <View className="mb-2 flex-row items-center">
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('profile.gender')}
                </Text>
                <View className="ml-2">
                  <InfoIcon />
                </View>
              </View>

              <Select
                value={{
                  value: gender,
                  label:
                    localizedGenderOptions.find((option) => option.value === gender)?.label ??
                    t('common.select'),
                }}
                onValueChange={(option) => {
                  setGender(option?.value ?? '');
                }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {localizedGenderOptions.map((option) => (
                    <SelectItem key={option.value} label={option.label} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            <Button
              action="primary"
              variant="solid"
              size="control"
              onPress={handleSaveProfile}
              className="mb-4 mt-8 w-full rounded-md">
              <ButtonText>{saving ? t('profile.saving') : t('profile.continue')}</ButtonText>
            </Button>
          </View>
        </ScrollView>

        {(loading || saving) && <LoadingView />}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 6,
    paddingHorizontal: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  avatarWrapper: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formWrapper: { paddingHorizontal: 24 },
});
