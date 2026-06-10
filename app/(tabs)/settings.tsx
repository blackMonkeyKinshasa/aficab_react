import { ComponentProps, useState } from 'react';
import { Alert, Linking, ScrollView, Share, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  Languages,
  LogOut,
  type LucideIcon,
  MessageCircle,
  Share2,
  Shield,
  Trash2,
  Users,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { deleteUserByID } from '@/api/user';
import { Avatar } from '@/components/my-ui/Avatar';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { buildStackScreenOptions, HEADER_SIDE_WIDTH } from '@/components/my-ui/ScreenHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { SUPPORT_EMAIL_URL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/constants/databaseEnum';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { resetUserSessionState, useMyStateUser } from '@/store';
import { useAppConfigState } from '@/store/app-config-state';
import { AppLanguage, useAppLanguageState } from '@/store/language-state';

const SCREEN_OPTIONS = (title: string, isDark: boolean, onPress: () => void) =>
  buildStackScreenOptions({
    title,
    isDark,
    headerRight: () => (
      <View style={{ width: HEADER_SIDE_WIDTH, alignItems: 'flex-end' }}>
        <NotificationIcon isDark={isDark} onPress={onPress} />
      </View>
    ),
  });

type AppLanguageStoreState = ReturnType<typeof useAppLanguageState.getState>;
type UserStoreState = ReturnType<typeof useMyStateUser.getState>;

export default function SettingsScreen() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const { language, t, tf } = useI18n();
  const toast = useAppToast();
  const setLanguage = useAppLanguageState((state: AppLanguageStoreState) => state.setLanguage);
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const cachedUser = useMyStateUser((state: UserStoreState) => state.user);
  const analytics = useAnalytics();
  const avatarUrl = cachedUser?.avatar_url || '';
  const displayName = cachedUser?.full_name || t('settings.defaultUser');
  const displayEmail = cachedUser?.email || t('settings.defaultEmail');
  const languageOptions: { label: string; value: AppLanguage }[] = [
    { label: t('language.optionFrench'), value: 'fr' },
    { label: t('language.optionEnglish'), value: 'en' },
  ];
  const { refreshAppConfig, localClientVersion } = useAppConfigState();

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
      toast({
        title: t('common.error'),
        description: t('settings.openLinkError'),
        action: 'error',
      });
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
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMessage'), [
      { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
      {
        text: t('settings.logout'),
        onPress: async () => {
          setLoading(true);
          try {
            await supabase.auth.signOut();
            resetUserSessionState();
            //  router.replace('/(auth)/login');
          } catch {
            toast({
              title: t('common.error'),
              description: t('settings.logoutError'),
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
      className={`flex-row items-center justify-between px-4 py-3`}>
      <View className="flex-1 flex-row items-center">
        <Icon size={20} color={isDanger ? '#ef4444' : isDark ? '#ffffff' : '#12151C'} />
        <Text
          className={`ml-4 text-sm font-semibold ${
            isDanger ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'
          }`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const SectionTitle = ({ title, isOrange = false }: { title: string; isOrange?: boolean }) => (
    <Text
      className={`px-4 py-4 text-base font-bold ${
        isOrange ? 'text-primary' : isDark ? 'text-white' : 'text-gray-900'
      }`}>
      {title}
    </Text>
  );

  const ContactItem = ({
    label,
    value: _value,
    icon,
    onPress,
  }: {
    label: string;
    value: string;
    icon: ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`mx-4 mb-3 flex-row items-center justify-between rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-neutral-800' : 'border-input bg-gray-100'}`}>
      <View className="flex-1 flex-row items-center">
        <Ionicons
          name={icon}
          size={16}
          color={isDark ? '#ffffff' : '#12151C'}
          style={{ marginRight: 10 }}
        />

        <View className="flex-1">
          <Text
            className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={SCREEN_OPTIONS(t('settings.title'), isDark, () => router.push('../Notifications'))}
      />
      <View className={`flex-1`}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header avec Avatar */}
          <TouchableOpacity onPress={() => router.push('/edit-profile')} className="mr-4">
            <View className="mb-4 ml-4 flex-row items-center">
              {/** Avatar */}
              <View className="ml-2 mr-4 mt-4 flex-row items-center">
                <Avatar uri={avatarUrl} size={60} borderRadius={30} isDark={isDark} />
              </View>

              <View className="flex-1">
                <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {displayName}
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {displayEmail}
                </Text>
              </View>

              <ChevronRight size={24} color={isDark ? '#ffffff' : '#000000'} />
            </View>
          </TouchableOpacity>

          <View className="ml-6 mr-6 flex-row items-center">
            <View className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
          </View>

          {/* Paramètres généraux */}
          <View className="ml-3 mt-4">
            <MenuItem icon={Languages} label={t('language.label')} onPress={() => {}} />
            <View className="px-4 pb-3 ">
              <Select
                value={{
                  value: language,
                  label:
                    languageOptions.find((option) => option.value === language)?.label ??
                    t('common.select'),
                }}
                onValueChange={(option) => {
                  setLanguage((option?.value as AppLanguage) ?? 'fr');
                }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
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
                  <View className="flex-1 flex-row items-center">
                    <MessageCircle size={20} color={isDark ? '#ffffff' : '#12151C'} />
                    <Text
                      className={`ml-4 text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              refreshAppConfig();
              setLoading(false);
            }}
            className="flex-row items-center justify-center">
            <Text className="text-center text-sm text-gray-500">
              {tf('settings.buildVersion', { version: localClientVersion })}
            </Text>
          </TouchableOpacity>
          <View className="h-8" />
        </ScrollView>
        {loading && <LoadingView />}
      </View>
    </>
  );
}
