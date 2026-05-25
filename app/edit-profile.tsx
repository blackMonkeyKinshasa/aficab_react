import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';

import { usePreventRemove } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { uploadAvatar } from '@/api/uploadFiles';
import { getUserByID, updateUserByID } from '@/api/user';
import { Avatar } from '@/components/my-ui/Avatar';
import { FormField } from '@/components/my-ui/FormField';
import { InfoIcon } from '@/components/my-ui/InfoIcon';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { genderOptions } from '@/constants/constants';
import { User } from '@/constants/dataInterface';
import { pickImageToGallery, takePhoto, uriToBlob } from '@/constants/image-manager';
import { useI18n } from '@/lib/i18n';
import { getUserLocationDetails } from '@/lib/my-location';
import { supabase } from '@/lib/supabase';
import { useMyStateUser } from '@/store/user-state';

export default function EditProfile() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { focusField, returnToBooking } = useLocalSearchParams() as {
    focusField?: string;
    returnToBooking?: string;
  };
  const loc = getUserLocationDetails();
  const scrollViewRef = useRef<ScrollView>(null);

  const [userID, setUserID] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('STANDARD');
  const [initialData, setInitialData] = useState(null);
  const [update, setUpdate] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [indicatif, setIndicatif] = useState<string | null>(null);
  const [phoneFieldY, setPhoneFieldY] = useState(0);
  const storedUser = useMyStateUser((state) => state.user);
  const setStoredUser = useMyStateUser((state) => state.setUser);
  const shouldHighlightPhone = focusField === 'phone';
  const shouldReturnToBooking = returnToBooking === '1';
  const { t } = useI18n();
  const localizedGenderOptions = genderOptions.map((option) => ({
    ...option,
    label: option.value === 'male' ? t('profile.genderMale') : t('profile.genderFemale'),
  }));
  const localizedStatus =
    status === 'PREMIUM' ? t('profile.statusPremium') : t('profile.statusStandard');

  const navigation = useNavigation();

  usePreventRemove(update, ({ data }) => {
    Alert.alert(t('profile.unsavedTitle'), t('profile.unsavedMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.leave'),
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  const hydrateForm = (data: User) => {
    setUserID(data.id);
    setFullName(data.full_name || '');
    setPhoneNumber(data.phone || '');
    setGender(data.genre || '');
    setStatus(data.clientType || 'STANDARD');
    setEmail(data.email || '');
    setInitialData(data as any);
    setImage(data.avatar_url || '');
    setUpdate(false);
  };

  useEffect(() => {
    if (storedUser) {
      hydrateForm(storedUser);
      return;
    }

    const loadLocation = async () => {
      const locationDetails = await getUserLocationDetails();
      const thisCity = locationDetails.city ?? null;
      const thisCountry = locationDetails.country ?? null;
      const thisCode = locationDetails.countryCode ?? null;
      setCity(thisCity);
      setCountry(thisCountry);
      setCountryCode(thisCode);
      setIndicatif(locationDetails.indicatif ?? null);
    };

    const loadUserData = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const data = await getUserByID(user.id);
        console.log('userID :', user.id);

        if (data) {
          setStoredUser(data);
          hydrateForm(data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement du profil:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLocation();

    loadUserData();

    return () => {
      if (update) {
        Alert.alert(t('profile.unsavedTitle'), t('profile.unsavedMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.leave'), style: 'destructive', onPress: () => router.back() },
        ]);
      }
    };
  }, [setStoredUser, storedUser]);

  useEffect(() => {
    if (!shouldHighlightPhone) {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(phoneFieldY - 24, 0),
        animated: true,
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [phoneFieldY, shouldHighlightPhone]);

  const chooseImage = () => {
    Alert.alert(t('profile.selectImageTitle'), t('profile.selectImageMessage'), [
      {
        text: t('profile.camera'),
        onPress: async () => {
          let image = await takePhoto();
          if (image) {
            setImage(image);
            update || setUpdate(true);
          }
        },
      },
      {
        text: t('profile.gallery'),
        onPress: async () => {
          let image = await pickImageToGallery();
          if (image) {
            setImage(image);
            update || setUpdate(true);
          }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('profile.requiredTitle'), t('profile.fullNameRequired'));
      return;
    }
    if (!userID) return;

    setLoading(true);

    try {
      let avatarUrl = image;

      if (image && !image.startsWith('http')) {
        const res = await uploadAvatar(await uriToBlob(image));
        avatarUrl = res.url;
        console.log('Avatar uploadé avec succès:', res);
        supabase.auth.updateUser({ data: { avatar_url: res.url } });
        setImage(avatarUrl);
      }

      await updateUserByID(userID, {
        full_name: fullName,
        phone: phoneNumber.trim() || null,
        genre: gender || null,
        avatar_url: avatarUrl || null,
        country: country || null,
        city: city || null,
      } as User);

      const refreshedUser = await getUserByID(userID);

      if (refreshedUser) {
        setStoredUser(refreshedUser);
        hydrateForm(refreshedUser);
      }

      setLoading(false);

      if (shouldReturnToBooking) {
        router.back();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert(t('common.error'), err?.message ?? t('profile.genericErrorMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={`flex-1`}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Avatar Section */}
        <View className="mb-8 mt-8 items-center">
          <View
            className={`relative h-24 w-24 items-center justify-center rounded-full ${
              isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
            {/* User Icon */}
            <Avatar uri={image || ''} size={96} borderRadius={48} isDark={isDark} />

            {/* Camera Icon Button */}
            <TouchableOpacity
              className={`absolute bottom-0 right-0 h-10 w-10 items-center justify-center rounded-full bg-orange-500 shadow-lg`}
              onPress={chooseImage}>
              <Camera size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          <Text
            className={`mt-4 text-sm font-bold tracking-wide ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
            {localizedStatus}
          </Text>
        </View>

        {/* Form Section */}
        <View className="px-6">
          {/* Full Name */}
          <FormField
            label={t('profile.fullName')}
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
          <View
            onLayout={(event) => setPhoneFieldY(event.nativeEvent.layout.y)}
            style={
              shouldHighlightPhone
                ? {
                    borderWidth: 1,
                    borderColor: '#f97316',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    backgroundColor: isDark ? '#262626' : '#fff7ed',
                  }
                : undefined
            }>
            <FormField
              label={t('profile.phoneNumber')}
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
            {shouldHighlightPhone ? (
              <Text className="mb-2 text-sm text-orange-500">{t('profile.phoneHintBooking')}</Text>
            ) : null}
          </View>

          {/* Gender */}
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
                update || setUpdate(true);
              }}>
              <SelectTrigger className={isDark ? 'bg-neutral-800' : 'bg-gray-100'}>
                <SelectValue
                  className={isDark ? 'text-white' : 'text-gray-900'}
                  placeholder={t('common.select')}
                />
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

          {/* Email (Read-only) */}
          <FormField
            label={t('profile.email')}
            value={email}
            onChangeText={() => {}}
            placeholder="adresse@email.com"
            editable={false}
            isDark={isDark}
          />

          {/* Save Button */}

          {update && (
            <Button
              onPress={handleSaveProfile}
              disabled={loading}
              className="mb-4 mt-8 h-12 rounded-lg bg-orange-500">
              <Text className="text-base font-bold text-white">
                {loading ? t('profile.saving') : t('profile.saveChanges')}
              </Text>
            </Button>
          )}
        </View>
      </ScrollView>
      {loading && <LoadingView />}
    </View>
  );
}
