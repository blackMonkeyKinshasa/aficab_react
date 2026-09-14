import { ComponentProps, useState } from 'react';
import { Alert, Linking, ScrollView, Share, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  Languages,
  LogOut,
  MessageCircle,
  Share2,
  Shield,
  Users,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { deleteUserByID } from '@/api/user';
import { Avatar } from '@/components/my-ui/Avatar';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { NotificationIcon } from '@/components/my-ui/NotificationIcon';
import { buildStackScreenOptions, HEADER_SIDE_WIDTH } from '@/components/my-ui/ScreenHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Text } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { SUPPORT_EMAIL_URL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/constants/databaseEnum';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { resetUserSessionState, useMyStateUser } from '@/store';
import { useAppConfigState } from '@/store/app-config-state';
import { AppLanguage, useAppLanguageState } from '@/store/language-state';
import { MenuItem } from '@/components/my-ui/MenuItem';

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
  const [languageOpen, setLanguageOpen] = useState(false);
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
  const { s, font } = useLayoutScale();
  const iconWell = s(36);

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
    iconColor,
    iconBackgroundColor,
    onPress,
  }: {
    label: string;
    value: string;
    icon: ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
    iconBackgroundColor: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`mx-4 mb-3 flex-row items-center justify-between rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-neutral-800' : 'border-input bg-gray-100'}`}>
      <View className="flex-1 flex-row items-center">
        <View
          className="items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBackgroundColor, width: iconWell, height: iconWell }}>
          <Ionicons name={icon} size={s(16)} color={iconColor} />
        </View>

        <View className="ml-3 flex-1">
          <Text
            className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
            style={{ fontSize: font.base }}>
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
                <Text className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: font.xl }}>
                  {displayName}
                </Text>
                <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`} style={{ fontSize: font.sm }}>
                  {displayEmail}
                </Text>
              </View>

              <ChevronRight size={s(24)} color={isDark ? '#ffffff' : '#000000'} />
            </View>
          </TouchableOpacity>

          <View className="ml-6 mr-6 flex-row items-center">
            <View className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
          </View>

          {/* Paramètres généraux */}
          <View className="ml-3 mt-4 gap-2">
            <Collapsible open={languageOpen} onOpenChange={setLanguageOpen}>
              <CollapsibleTrigger asChild>
                <TouchableOpacity className="flex-row items-center justify-between px-4 py-2.5">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="items-center justify-center rounded-xl"
                      style={{ backgroundColor: '#F0F0FF', width: iconWell, height: iconWell }}>
                      <Languages size={s(19)} color="#5B5BD6" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-semibold ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                        style={{ fontSize: font.base }}>
                        {t('language.label')}
                      </Text>
                      <Text
                        className={`mt-0.5 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}
                        style={{ fontSize: font.sm }}>
                        {languageOptions.find((option) => option.value === language)?.label}
                      </Text>
                    </View>
                  </View>
                  {languageOpen ? (
                    <ChevronUp size={s(20)} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  ) : (
                    <ChevronDown size={s(20)} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  )}
                </TouchableOpacity>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <View
                  className={`mx-4 mb-3 overflow-hidden rounded-xl border ${
                    isDark ? 'border-gray-700 bg-neutral-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                  {languageOptions.map((option, index) => {
                    const selected = language === option.value;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        className={`flex-row items-center justify-between px-4 py-3 ${
                          index > 0
                            ? isDark
                              ? 'border-t border-gray-700'
                              : 'border-t border-gray-200'
                            : ''
                        }`}
                        onPress={() => {
                          setLanguage(option.value);
                          setLanguageOpen(false);
                        }}>
                        <Text
                          className={`font-semibold ${
                            selected ? 'text-primary' : isDark ? 'text-white' : 'text-gray-900'
                          }`}
                          style={{ fontSize: font.base }}>
                          {option.label}
                        </Text>
                        {selected ? <Check size={s(19)} color={color.primary} strokeWidth={3} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </CollapsibleContent>
            </Collapsible>

            <Link href="https://aficab.com/politique-de-confidentialite" asChild>
              <MenuItem
                icon={Shield}
                iconColor="#16A34A"
                iconBackgroundColor="#EAFBF0"
                label={t('settings.privacyPolicy')}
                isDark={isDark}
                onPress={() => {
                  // Naviguer vers la page de politique
                }}
              />
            </Link>

            <Link href="https://aide.aficab.com/" asChild>
              <MenuItem
                icon={HelpCircle}
                iconColor="#F59E0B"
                iconBackgroundColor="#FFF7E6"
                label={t('settings.faq')}
                isDark={isDark}
                onPress={() => {
                  // Naviguer vers la FAQ
                }}
              />
            </Link>

            <Collapsible open={contactOpen} onOpenChange={handleContactOpenChange}>
              <CollapsibleTrigger asChild>
                <TouchableOpacity className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="items-center justify-center rounded-xl"
                      style={{ backgroundColor: '#CCFBF1', width: iconWell, height: iconWell }}>
                      <MessageCircle size={s(19)} color="#0D9488" />
                    </View>
                    <Text
                      className={`ml-3 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                      style={{ fontSize: font.base }}>
                      {t('settings.contactUs')}
                    </Text>
                  </View>
                  {contactOpen ? (
                    <ChevronUp size={s(20)} color={isDark ? '#9ca3af' : '#6b7280'} />
                  ) : (
                    <ChevronDown size={s(20)} color={isDark ? '#9ca3af' : '#6b7280'} />
                  )}
                </TouchableOpacity>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <View className="py-2">
                  <ContactItem
                    label={t('settings.whatsapp')}
                    value={SUPPORT_PHONE}
                    icon="logo-whatsapp"
                    iconColor="#16A34A"
                    iconBackgroundColor="#EAFBF0"
                    onPress={() => handleOpenLink(SUPPORT_WHATSAPP_URL, 'whatsapp')}
                  />
                  <ContactItem
                    label={t('settings.call')}
                    value={SUPPORT_PHONE}
                    icon="call-outline"
                    iconColor="#2563EB"
                    iconBackgroundColor="#EFF6FF"
                    onPress={() => handleOpenLink(`tel:${SUPPORT_PHONE}`, 'phone')}
                  />
                  <ContactItem
                    label={t('settings.email')}
                    value="http://www.aficab.com"
                    icon="mail-outline"
                    iconColor="#EA580C"
                    iconBackgroundColor="#FFEDD5"
                    onPress={() => handleOpenLink(SUPPORT_EMAIL_URL, 'email')}
                  />
                </View>
              </CollapsibleContent>
            </Collapsible>

            {/* À propos et partage 
            <SectionTitle title={t('settings.aboutSharing')} isOrange />
*/}
            <Link href="https://aficab.com/a-propos" asChild>
              <MenuItem
                icon={Share2}
                iconColor="#FF5705"
                iconBackgroundColor="#FFF3EC"
                label={t('settings.aboutApp')}
                isDark={isDark}
                onPress={() => {
                  // Naviguer vers la page à propos
                }}
              />
            </Link>

            <MenuItem
              icon={Users}
              iconColor="#2563EB"
              iconBackgroundColor="#EFF6FF"
              label={t('settings.inviteFriend')}
              isDark={isDark}
              onPress={async () => {
                await Share.share({
                  message: `👉 Rejoins Aficab et profite d’un service de transport fiable, rapide et confortable à Kinshasa. : https://aficab.com/redirect`,
                });
              }}
            />

            {/* Compte
            <SectionTitle title={t('settings.account')} isOrange />
 */}
            <MenuItem
              icon={LogOut}
              iconColor="#EF4444"
              iconBackgroundColor="#FEF2F2"
              label={t('settings.logout')}
              onPress={handleLogout}
              isDanger
              isDark={isDark}
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
