import { Text } from '@/components/ui/text';
import { View, ScrollView, TouchableOpacity, Alert, Linking, Share } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {Avatar} from '@/components/my-ui/Avatar';
import { LoadingView } from '@/components/my-ui/LoadingView';
import {NotificationIcon} from '@/components/my-ui/NotificationIcon';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Stack} from 'expo-router';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { deleteUserByID } from '@/api/user';
import { resetUserSessionState, useMyStateUser } from '@/store';
import { AppLanguage, useAppLanguageState } from '@/store/language-state';
import { SUPPORT_EMAIL_URL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/constants/databaseEnum';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import {
  Shield,
  HelpCircle,
  MessageCircle,
  Share2,
  Users,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoonStarIcon,
  Languages,
  SunIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { useAppConfigState } from '@/store/app-config-state';

const SCREEN_OPTIONS = (title : string, isDark : boolean, onPress: () => void) => ({
  title: title,
  headerTransparent: false,
  headerRight: () =>  <NotificationIcon
                        isDark={isDark}
                        onPress={onPress}
                      />,
});

export default function SettingsScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const { language, t } = useI18n();
  const setLanguage = useAppLanguageState((state) => state.setLanguage);
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const cachedUser = useMyStateUser((state) => state.user);
  const analytics = useAnalytics();
  const avatarUrl = cachedUser?.avatar_url || '';
  const displayName = cachedUser?.full_name || t('settings.defaultUser');
  const displayEmail = cachedUser?.email || t('settings.defaultEmail');
  const languageOptions: Array<{ label: string; value: AppLanguage }> = [
    { label: t('language.optionFrench'), value: 'fr' },
    { label: t('language.optionEnglish'), value: 'en' },
  ];
  const { refreshAppConfig, localClientVersion  } = useAppConfigState();
  
  const THEME_ICONS = {
    light: SunIcon,
    dark: MoonStarIcon,
  };

  const handleOpenLink = async (url: string, channel?: 'whatsapp' | 'phone' | 'email') => {
    if (channel && cachedUser?.id) {
      analytics.trackSupportChannelSelected(cachedUser.id, {
        email: cachedUser.email ?? '',
        role: cachedUser.role ?? 'unknown',
        sourceScreen: 'settings',
        channel,
      });
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('settings.openLinkError'));
    }
  };

  const handleContactOpenChange = (open: boolean) => {
    setContactOpen(open);

    if (open && cachedUser?.id) {
      analytics.trackSupportContactOpened(cachedUser.id, {
        email: cachedUser.email ?? '',
        role: cachedUser.role ?? 'unknown',
        sourceScreen: 'settings',
      });
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmMessage'),
      [
        { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
        {
          text: t('settings.logout'),
          onPress: async () => {
            setLoading(true);
            try {
              await supabase.auth.signOut();
              resetUserSessionState();
            //  router.replace('/(auth)/login');
            } catch (err) {
              Alert.alert(t('common.error'), t('settings.logoutError'));
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      t('settings.deleteConfirmTitle'),
      t('settings.deleteConfirmMessage'),
      [
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
            } catch (err) {
              Alert.alert(t('common.error'), t('settings.deleteError'));
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onPress,
    isDanger = false,
  }: {
    icon: LucideIcon;
    label: string;
    onPress: () => void | Promise<void>;
    isDanger?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between py-3 px-4 `}
    >
      <View className="flex-row items-center flex-1">
        <Icon
          size={20}
          color={isDanger ? '#ef4444' : isDark ? '#ffffff' : '#12151C'}
         
        />
        <Text
          className={`text-sm font-semibold ml-4 ${
            isDanger
              ? 'text-red-500'
              : isDark
              ? 'text-white'
              : 'text-gray-900'
          }`}
        >
          {label}
        </Text>
      </View>
     
    </TouchableOpacity>
  );

  const SectionTitle = ({
    title,
    isOrange = false,
  }: {
    title: string;
    isOrange?: boolean;
  }) => (
    <Text
      className={`text-base font-bold px-4 py-4 ${
        isOrange
          ? 'text-orange-500'
          : isDark
          ? 'text-white'
          : 'text-gray-900'
      }`}
    >
      {title}
    </Text>
  );

  const ContactItem = ({
    label,
    value,
    icon,
    onPress,
  }: {
    label: string;
    value: string;
    icon:  ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`mx-4 mb-3 flex-row items-center justify-between rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-neutral-800' : 'border-input bg-gray-100'}`}
    >
        <View className="flex-row items-center flex-1">
           
            <Ionicons name={icon} size={16} color={isDark ? '#ffffff' : '#12151C'} style={{marginRight: 10}} />

            <View className="flex-1">
              <Text className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {label}
              </Text>
             
            </View>

        </View>

      
    </TouchableOpacity>
  );

  return (
     <>
    <Stack.Screen options={SCREEN_OPTIONS(t('settings.title'), isDark, () => router.push('../Notifications'))} />
    <View className={`flex-1 `}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header avec Avatar */}
         <TouchableOpacity onPress={() => router.push('/edit-profile')} className="mr-4">
          
              <View className="flex-row items-center ml-4  mb-4">
                
                  {/** Avatar */}
                      <View className="flex-row items-center mr-4 ml-2 mt-4">
                        <Avatar uri={avatarUrl} size={60} borderRadius={30} isDark={isDark} />
                      </View>

                  {/** full_name &  email*/}

                  <View className="flex-1 justify-center">
                    <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {displayName}
                    </Text>
                    <Text className={`text-base font-medium line-clamp-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                      {displayEmail}
                    </Text>
                    
                  </View>
                  
                  <ChevronRight size={24} color={isDark ? '#ffffff' : '#000000'} />
                


                </View>

           </TouchableOpacity>
            

          <View className="flex-row items-center ml-6 mr-6 ">
            <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600 " />
           
          </View>

        {/* Paramètres généraux */}
          <View className="ml-3 mt-4">


         <MenuItem
            icon={Languages}
            label= {t('language.label')}
            onPress={() => {
             
            }}
          />
          <View className="px-4 pb-3">

            <Select
              value={{
                value: language,
                label: languageOptions.find((option) => option.value === language)?.label ?? t('common.select'),
              }}
              onValueChange={(option) => {
                setLanguage((option?.value as AppLanguage) ?? 'fr');
              }}
            >
              <SelectTrigger className={isDark ? 'bg-neutral-800' : 'bg-gray-100'}>
                <SelectValue
                  className={isDark ? 'text-white' : 'text-gray-900'}
                  placeholder={t('common.select')}
                />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} label={option.label} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>

         <MenuItem
            icon={THEME_ICONS[colorScheme ?? 'light']}
            label={t('settings.theme')}
            onPress={() => {
              // Changer le theme
              toggleColorScheme();
            }}
          />



        <Link href="https://aficab.com/politique-de-confidentialite" asChild>
          <MenuItem
            icon={Shield}
            label={t('settings.privacyPolicy')}
            onPress={() => {
              // Naviguer vers la page de politique
            }}
          />
        </Link>


        <Link href="https://aide.aficab.com/" asChild>
          <MenuItem
            icon={HelpCircle}
            label={t('settings.faq')}
            onPress={() => {
              // Naviguer vers la FAQ
            }}
          />
         </Link>

        <Collapsible open={contactOpen} onOpenChange={handleContactOpenChange}>
          <CollapsibleTrigger asChild>
            <TouchableOpacity className="flex-row items-center justify-between px-4 py-3">
              <View className="flex-row items-center flex-1">
                <MessageCircle size={20} color={isDark ? '#ffffff' : '#12151C'} />
                <Text className={`text-sm font-semibold ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('settings.contactUs')}
                </Text>
              </View>
              {contactOpen ? (
                <ChevronUp size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              ) : (
                <ChevronDown size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              )}
            </TouchableOpacity>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <View className="py-2">
              <ContactItem
                label={t('settings.whatsapp')}
                value={SUPPORT_PHONE}
                icon="logo-whatsapp"
                onPress={() => handleOpenLink(SUPPORT_WHATSAPP_URL, 'whatsapp')}
              />
              <ContactItem
                label={t('settings.call')}
                value={SUPPORT_PHONE}
                icon="call-outline"
                onPress={() => handleOpenLink(`tel:${SUPPORT_PHONE}`, 'phone')}
              />
              <ContactItem
                label={t('settings.email')}
                value="http://www.aficab.com"
                icon="mail-outline"
                onPress={() => handleOpenLink(SUPPORT_EMAIL_URL, 'email')}
              />
            </View>
          </CollapsibleContent>
        </Collapsible>

        {/* À propos et partage */}
        <SectionTitle title={t('settings.aboutSharing')} isOrange />

        <Link href="https://aficab.com/a-propos" asChild>
            <MenuItem
              icon={Share2}
              label={t('settings.aboutApp')}
              onPress={() => {
                // Naviguer vers la page à propos
              }}
            />
        </Link>


        <MenuItem
          icon={Users}
          label={t('settings.inviteFriend')}
          onPress={async () => {
            await Share.share({
              message: `👉 Rejoins Aficab et profite d’un service de transport fiable, rapide et confortable à Kinshasa. : https://aficab.com/redirect`,
            });
          }}
        />

        {/* Compte */}
        <SectionTitle title={t('settings.account')} isOrange />

        <MenuItem
          icon={LogOut}
          label={t('settings.logout')}
          onPress={handleLogout}
          isDanger={false}
        />

        <MenuItem
          icon={Trash2}
          label={t('settings.deleteAccount')}
          onPress={handleDeleteAccount}
          isDanger
        />

        </View>
        {/* Espacement bas */}
        <View className="h-8" />
        <TouchableOpacity onPress={() => {
          setLoading(true);
          refreshAppConfig();
          setLoading(false);

        }} className="flex-row items-center justify-center">
        <Text className="text-center text-sm text-gray-500">{t('settings.buildVersionLabel')}: {localClientVersion}</Text>
        </TouchableOpacity>
         <View className="h-8" />

      </ScrollView>
       {loading && (
              <LoadingView />
            )}
    </View>
     </>
  );
}