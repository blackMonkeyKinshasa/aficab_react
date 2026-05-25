import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';

type Props = {
  userName?: string;
  email?: string;
  onPressMyBookings?: () => void;
  onPressContact?: () => void;
};

export function ReservationConfirmedScreen({
  userName = 'Bertin C1',
  email = 'bertinselendo2c1@gmail.com',
  onPressMyBookings,
  onPressContact,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  const { t, tf } = useI18n();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Badge (cercles + check) */}
        <View style={styles.badgeWrap}>
          <View style={[styles.ringOuter, { backgroundColor: theme.ringOuter }]}>
            <View style={[styles.ringMiddle, { backgroundColor: theme.ringMiddle }]}>
              <View style={[styles.ringInner, { backgroundColor: theme.accent }]}>
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>

        {/* Textes */}
        <Text style={[styles.kicker, { color: theme.textPrimary }]}>
          {tf('confirmation.kickerMessage', { userName })}
        </Text>

        <Text style={[styles.title, { color: theme.heading }]}>{t('confirmation.title')}</Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {tf('confirmation.subtitleMessage', { email })}
        </Text>

        {/* Boutons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onPressMyBookings}
            activeOpacity={0.75}
            style={[
              styles.button,
              styles.buttonPrimary,
              {
                backgroundColor: theme.primaryButtonBg,
                borderColor: theme.primaryButtonBorder,
              },
            ]}>
            <Text style={[styles.buttonPrimaryText, { color: theme.primaryButtonText }]}>
              {t('confirmation.myBookings')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPressContact}
            activeOpacity={0.75}
            style={[
              styles.button,
              styles.buttonSecondary,
              {
                backgroundColor: theme.secondaryButtonBg,
                borderColor: theme.secondaryButtonBorder,
              },
            ]}>
            <Text style={[styles.buttonSecondaryText, { color: theme.secondaryButtonText }]}>
              {t('confirmation.contactUs')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const lightTheme = {
  background: '#FFFFFF',
  accent: '#16A34A',
  ringOuter: 'rgba(34, 197, 94, 0.12)',
  ringMiddle: 'rgba(34, 197, 94, 0.22)',
  heading: '#0B0B0B',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  primaryButtonBg: '#FFFFFF',
  primaryButtonBorder: '#16A34A',
  primaryButtonText: '#111827',
  secondaryButtonBg: '#FFFFFF',
  secondaryButtonBorder: '#D1D5DB',
  secondaryButtonText: '#111827',
};

const darkTheme = {
  background: color.appDarkBackground,
  accent: '#22C55E',
  ringOuter: 'rgba(34, 197, 94, 0.16)',
  ringMiddle: 'rgba(34, 197, 94, 0.28)',
  heading: '#F9FAFB',
  textPrimary: '#E5E7EB',
  textSecondary: '#9CA3AF',
  primaryButtonBg: '#1F2937',
  primaryButtonBorder: '#22C55E',
  primaryButtonText: '#F9FAFB',
  secondaryButtonBg: color.appDarkBackground,
  secondaryButtonBorder: '#374151',
  secondaryButtonText: '#E5E7EB',
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeWrap: { marginBottom: 18 },
  ringOuter: {
    width: 118,
    height: 118,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringMiddle: {
    width: 86,
    height: 86,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    // ombre légère
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  kicker: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 520,
    marginBottom: 18,
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 148,
    alignItems: 'center',
  },
  buttonPrimary: {},
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonSecondary: {},
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
