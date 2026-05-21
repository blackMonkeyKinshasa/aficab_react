import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Linking,ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Inclus par défaut dans Expo
import { supabase } from '@/lib/supabase';
import { resetUserSessionState, useMyStateUser } from '@/store';
import { useColorScheme } from 'nativewind';
import { getUserByID } from '@/api/user';
import { User } from '@/constants/dataInterface';
import { SUPPORT_EMAIL_URL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/constants/databaseEnum';
import { useAnalytics } from '@/lib/analytics';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export default function ChekRole() {
  const router = useRouter();
  const setStoredUser = useMyStateUser((state) => state.updateUser);
  const storedUser = useMyStateUser((state) => state.user);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const analytics = useAnalytics();
  const { t, tf } = useI18n();

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) {
          return;
        }

        const freshUser = await getUserByID(user.id);

        if (!isMounted || !freshUser) {
          return;
        }

        setRemoteUser(freshUser);
        setStoredUser(freshUser);
      } catch (error) {
        console.error('Erreur lors de la récupération de l’utilisateur:', error);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [setStoredUser]);

  const currentUser = remoteUser ?? storedUser;
  const accountLabel = currentUser?.role === 'ADMIN'
    ? t('role.admin')
    : currentUser?.role === 'MANAGER'
    ? t('role.manager')
    : currentUser?.role === 'DRIVER'
    ? t('role.driver')
    : currentUser?.role === 'CLIENT'
    ? t('role.client')
    : t('role.partner');

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    analytics.trackRoleMismatchScreenViewed(currentUser.id, {
      email: currentUser.email ?? '',
      role: currentUser.role ?? 'unknown',
    });
  }, [analytics, currentUser?.email, currentUser?.id, currentUser?.role]);

  const handleOpenLink = async (url: string, channel: 'whatsapp' | 'phone' | 'email') => {
    if (currentUser?.id) {
      analytics.trackSupportChannelSelected(currentUser.id, {
        email: currentUser.email ?? '',
        role: currentUser.role ?? 'unknown',
        sourceScreen: 'chekRole',
        channel,
      });
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('settings.openLinkError'));
    }
  };

  const handleContactSupport = () => {
    if (currentUser?.id) {
      analytics.trackSupportContactOpened(currentUser.id, {
        email: currentUser.email ?? '',
        role: currentUser.role ?? 'unknown',
        sourceScreen: 'chekRole',
      });
    }

    Alert.alert(
      t('settings.contactUs'),
      t('auth.supportMessage'),
      [
        { text: t('settings.whatsapp'), onPress: () => handleOpenLink(SUPPORT_WHATSAPP_URL, 'whatsapp') },
        { text: t('settings.call'), onPress: () => handleOpenLink(`tel:${SUPPORT_PHONE}`, 'phone') },
        { text: t('settings.email'), onPress: () => handleOpenLink(SUPPORT_EMAIL_URL, 'email') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleLogout = async () => {
    if (currentUser?.id) {
      analytics.trackLogout(currentUser.id);
    }

    await supabase.auth.signOut();
    resetUserSessionState();
   // router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? color.appDarkBackground : '#FFFFFF' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

        <ScrollView
              showsVerticalScrollIndicator={false}
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
      
      <View style={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#111111' : '#FFF4EB', borderColor: isDark ? '#27272A' : '#FED7AA' }]}>
          <View style={[styles.iconBadge, { backgroundColor: isDark ? '#2A160A' : '#FFE6D5' }]}>
            <MaterialCommunityIcons name="shield-alert-outline" size={28} color="#FF5C00" />
          </View>

          <Text style={[styles.eyebrow, { color: '#FF5C00' }]}>{t('role.accountCheck')}</Text>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>{t('role.notClientTitle')}</Text>
          <Text style={[styles.description, styles.heroDescription, { color: isDark ? '#A3A3A3' : '#666666' }]}>
            {tf('role.notClientDescription', { accountLabel })}
          </Text>

          <View style={[styles.infoRow, { marginTop: 24 }]}>
            <Text style={[styles.infoLabel, { color: isDark ? '#A3A3A3' : '#6B7280' }]}>{t('role.emailLabel')}</Text>
            <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>{currentUser?.email ?? t('role.emailMissing')}</Text>
          </View>

        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.description, { color: isDark ? '#A3A3A3' : '#666666' }]}>
            {t('role.incorrectInfo')}
          </Text>

          <Text style={[styles.description, { color: isDark ? '#A3A3A3' : '#666666' }]}>
            {t('role.useAnotherEmail')}
          </Text>
        </View>

        <Button
             className="h-14 flex-row items-center justify-center rounded-2xl my-3"
             style={{ backgroundColor: color.primary, width: "100%", minHeight:56, paddingVertical:16}}
             onPress={handleContactSupport}
           >
              <View className="flex-row items-center justify-center">
                      <MaterialCommunityIcons name="headset" size={18} color="#FFFFFF" />
                      <Text style={styles.buttonText}>{t('settings.contactUs')}</Text>
              </View>
            
        </Button>

        <Button 
        className="h-14 flex-row items-center justify-center rounded-2xl border my-3 "
        variant="outline"
        style={{ width: "100%", minHeight:56, paddingVertical:16,}}
           
        onPress={handleLogout}
         
        >
           <View className="flex-row items-center justify-center">
          <MaterialCommunityIcons name="logout-variant" size={20} color="#FF5C00" />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
          </View>
        </Button>

      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent : 'center',
    alignItems : 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: 12,
  },
  heroDescription: {
    marginBottom: 0,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  infoRow: {
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  rolePillText: {
    color: '#FF5C00',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  textContainer: {
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#FF5C00',
    width: '100%',
    minHeight: 56,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FF5C00',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
