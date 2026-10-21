import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';

import { usePreventRemove } from 'expo-router/react-navigation';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { uploadAvatar } from '@/api/uploadFiles';
import { deleteUserByID, getUserByID, updateUserByID } from '@/api/user';
import { Avatar } from '@/components/my-ui/Avatar';
import { FormField } from '@/components/my-ui/FormField';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { GenderDropdown } from '@/components/my-ui/GenderDropdown';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { genderOptions } from '@/constants/constants';
import { User } from '@/constants/dataInterface';
import { pickImageToGallery, takePhoto, uriToBlob } from '@/constants/image-manager';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { resetUserSessionState } from '@/store';
import { useMyStateUser, useUserStoreHydrated, type UserState } from '@/store/user-state';
import { Ionicons } from '@expo/vector-icons';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react-native';

type UserStoreState = ReturnType<typeof useMyStateUser.getState>;

export default function EditProfile() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { focusField, returnToBooking } = useLocalSearchParams() as {
    focusField?: string;
    returnToBooking?: string;
  };
  const scrollViewRef = useRef<ScrollView>(null);

  const [userID, setUserID] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('STANDARD');
  const [update, setUpdate] = useState(false);
  const cachedUser = useMyStateUser((state: UserStoreState) => state.user);
  const [image, setImage] = useState<string | null>(null);
  const [phoneFieldY, setPhoneFieldY] = useState(0);
  const hasHydratedInitialUser = useRef(false);
  const storedUser = useMyStateUser((state: UserState) => state.user);
  const setStoredUser = useMyStateUser((state: UserState) => state.setUser);
  const userStoreHydrated = useUserStoreHydrated();
  const shouldHighlightPhone = focusField === 'phone';
  const shouldReturnToBooking = returnToBooking === '1';
  const { t } = useI18n();
  const { s } = useLayoutScale();
  const toast = useAppToast();
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
    setImage(data.avatar_url || '');
    setUpdate(false);
  };

  useEffect(() => {
    if (!userStoreHydrated || hasHydratedInitialUser.current) {
      return;
    }

    let isMounted = true;

    const loadUserData = async () => {
      try {
        setLoading(true);

        if (storedUser) {
          if (isMounted) {
            hydrateForm(storedUser);
            hasHydratedInitialUser.current = true;
          }

          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const data = await getUserByID(user.id);

        if (data && isMounted) {
          setStoredUser(data);
          hydrateForm(data);
          hasHydratedInitialUser.current = true;
        }
      } catch (err) {
        console.error('Erreur lors du chargement du profil:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;

      if (update) {
        Alert.alert(t('profile.unsavedTitle'), t('profile.unsavedMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.leave'), style: 'destructive', onPress: () => router.back() },
        ]);
      }
    };
  }, [router, setStoredUser, storedUser, t, userStoreHydrated]);

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
          let imageUploaded = await pickImageToGallery();

          if (imageUploaded) {
            setImage(imageUploaded);
           
          update || setUpdate(true);
          }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

   const handleDeleteAccount = async () => {
      Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmMessage'), [
        { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
        {
          text: t('common.delete'),
          onPress: async () => {
            setLoading(true);
            try {
              const {
                data: { user: authUser },
              } = await supabase.auth.getUser();
              const userId = cachedUser?.id ?? authUser?.id;
  
              if (!userId) {
                throw new Error('Utilisateur introuvable pour la suppression du compte.');
              }
  
              await deleteUserByID(userId);
              await supabase.auth.signOut();
              resetUserSessionState();
              //  router.replace('/(auth)/login');
            } catch {
              toast({
                title: t('common.error'),
                description: t('settings.deleteError'),
                action: 'error',
              });
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
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
    if (!userID) return;

    setLoading(true);

    try {
      let avatarUrl = image;

      if (image && !image.startsWith('http')) {
        const res = await uploadAvatar(await uriToBlob(image));
        avatarUrl = res.url;
        supabase.auth.updateUser({ data: { avatar_url: res.url } });
        setImage(avatarUrl);
      }

      await updateUserByID(userID, {
        full_name: fullName,
        phone: phoneNumber.trim() || null,
        genre: gender || null,
        avatar_url: avatarUrl || null,
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
      toast({
        title: t('common.error'),
        description: err?.message ?? t('profile.genericErrorMessage'),
        action: 'error',
      });
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
            className={`relative items-center justify-center rounded-full ${
              isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}
            style={{ width: s(96), height: s(96) }}>
            {/* User Icon */}
            <Avatar uri={image || ''} size={96} borderRadius={48} isDark={isDark} />

            {/* Camera Icon Button */}
            <TouchableOpacity
              className="absolute bottom-0 right-0 items-center justify-center rounded-full bg-primary shadow-lg"
              style={{ width: s(40), height: s(40) }}
              onPress={chooseImage}>
              <Camera size={s(18)} color="white" />
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
              update || setUpdate(true);
            }}
            placeholder={t('profile.fullNamePlaceholder')}
          />

          {/* Phone Number */}
          <View
            onLayout={(event) => setPhoneFieldY(event.nativeEvent.layout.y)}
            style={
              shouldHighlightPhone
                ? {
                    borderWidth: 1,
                    borderColor: color.primary,
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
              tootipMessage="Ce numéro sera utilisé pour vous contacter et vous envoyer des notifications importantes."
            />
            {shouldHighlightPhone ? (
              <Text className="mb-2 text-sm text-primary">{t('profile.phoneHintBooking')}</Text>
            ) : null}
          </View>

         {/* Gender */}
         <View className="mb-6">
            <View className="mb-2 flex-row items-center">
              <Text className="text-sm font-medium text-gray-500">
                {t('profile.gender')}
              </Text>
              
          <Tooltip className="ml-2">
            <TooltipTrigger asChild> 
                <HelpCircle size={16} color="#999999" />
            </TooltipTrigger>
            <TooltipContent  className="ml-6 mr-6">
              <Text className="text-white text-sm font-normal ">Cette information nous aide à personnaliser votre profil et améliorer votre expérience.</Text>
            </TooltipContent>
          </Tooltip>
            </View>

            <GenderDropdown
              data={localizedGenderOptions}
              value={gender}
              placeholder={t('common.select')}
              isDark={isDark}
              onChange={(value) => {
                setGender(value);
                setUpdate(true);
              }}
            />
          </View>

          {/* Email (Read-only) */}
          <FormField
            label={t('profile.email')}
            value={email}
            onChangeText={() => {}}
            placeholder={t('profile.emailPlaceholder')}
            editable={false}
          />

           {/* button DeleteAccount */}
         { ! update && (<TouchableOpacity onPress={handleDeleteAccount} className="mt-6">
            <View className='flex-row border bg-red-500 border-red-500 h-14 rounded-md p-2 gap-4 items-center justify-center'>
              <Ionicons name='trash-outline' size={18} color='white' />
              <Text className='text-white text-base font-bold'>{t('settings.deleteAccount')}</Text>
            </View>

          </TouchableOpacity>)}




          {/* Save Button */}

          {update && (
            <Button
              action="primary"
              variant="solid"
              size="control"
              onPress={handleSaveProfile}
              isDisabled={loading}
              className="mb-4 mt-8 w-full rounded-md">
              <ButtonText>{loading ? t('profile.saving') : t('profile.saveChanges')}</ButtonText>
            </Button>
          )}
        </View>
      </ScrollView>
      {loading && <LoadingView />}
    </View>
  );
}
