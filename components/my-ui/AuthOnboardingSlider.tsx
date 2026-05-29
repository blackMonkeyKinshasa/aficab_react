import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CarFront, MapPinned, Zap } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import AppIntroSlider from 'react-native-app-intro-slider';

import { color } from '@/constants/colors';

type SlideItem = {
  key: string;
  title: string;
  text: string;
  icon: 'car' | 'flash' | 'map';
  eyebrow: string;
  caption: string;
};

const slides: SlideItem[] = [
  {
    key: '1',
    title: 'Une expérience premium',
    text: 'Des chauffeurs professionnels et des véhicules soignés pour un confort absolu',
    icon: 'car',
    eyebrow: 'Confort et discrétion',
    caption: 'Chauffeurs sélectionnés et véhicules soignés',
  },
  {
    key: '2',
    title: 'Réservation fluide',
    text: 'Réservez un chauffeur en quelques secondes grâce à un parcours simple et rapide',
    icon: 'flash',
    eyebrow: 'Réservation fluide',
    caption: 'Un parcours simple pensé pour aller droit au départ',
  },
  {
    key: '3',
    title: 'Maîtrisez votre trajet',
    text: 'Une visibilité totale avant, pendant et jusqu’à la fin de votre course',
    icon: 'map',
    eyebrow: 'Trajet sous contrôle',
    caption: 'Visibilité complète avant et pendant la course',
  },
];

function SlideIcon({ icon }: { icon: SlideItem['icon'] }) {
  if (icon === 'car') {
    return <CarFront size={42} color={color.primary} strokeWidth={2.2} />;
  }

  if (icon === 'flash') {
    return <Zap size={42} color={color.primary} strokeWidth={2.2} />;
  }

  return <MapPinned size={42} color={color.primary} strokeWidth={2.2} />;
}

export function AuthOnboardingSlider({ onDone }: { onDone: () => void | Promise<void> }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <AppIntroSlider
      data={slides}
      onDone={onDone}
      onSkip={onDone}
      showSkipButton
      activeDotStyle={{ backgroundColor: color.primary, width: 28 }}
      dotStyle={{ backgroundColor: isDark ? '#3F3F46' : '#D4D4D8' }}
      renderSkipButton={() => (
        <View style={styles.skipButton}>
          <Text style={[styles.skipText, { color: isDark ? '#E5E7EB' : '#111827' }]}>Ignorer</Text>
        </View>
      )}
      renderNextButton={() => (
        <View style={[styles.nextButton, { backgroundColor: isDark ? '#22252D' : '#111827' }]}>
          <Text style={styles.nextText}>Suivant</Text>
        </View>
      )}
      renderDoneButton={() => (
        <View style={styles.doneButton}>
          <Text style={styles.doneText}>Commencer</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View
          style={[styles.slide, { backgroundColor: isDark ? color.appDarkBackground : '#FFF7ED' }]}>
          <View style={[styles.glow, isDark ? styles.glowDark : styles.glowLight]} />
          <View style={[styles.heroCard, { backgroundColor: isDark ? '#171A21' : '#FFFFFF' }]}>
            <View style={styles.topRow}>
              <View style={[styles.brandPill, { backgroundColor: isDark ? '#22252D' : '#111827' }]}>
                <Text style={styles.brandPillText}>AFICAB</Text>
              </View>
              <Text style={[styles.cityText, { color: isDark ? '#B9BDC7' : '#6B7280' }]}>
                Kinshasa
              </Text>
            </View>

            <View style={styles.visualArea}>
              <View
                style={[
                  styles.visualHalo,
                  { backgroundColor: isDark ? 'rgba(255, 87, 5, 0.18)' : 'rgba(255, 87, 5, 0.12)' },
                ]}
              />
              <View style={[styles.iconWrap, { backgroundColor: isDark ? '#22252D' : '#FFF1E8' }]}>
                <SlideIcon icon={item.icon} />
              </View>
            </View>

            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {item.title}
            </Text>
            <Text style={[styles.text, { color: isDark ? '#C7C7CC' : '#4B5563' }]}>
              {item.text}
            </Text>

            <View style={styles.footerRow}>
              <View
                style={[
                  styles.footerPill,
                  {
                    backgroundColor: isDark ? '#20150F' : '#FFF1E8',
                    borderColor: isDark ? '#5F321B' : '#F3C4A8',
                  },
                ]}>
                <Text style={styles.footerPillText}>Mobilité premium</Text>
              </View>
              <View
                style={[
                  styles.footerPill,
                  {
                    backgroundColor: isDark ? '#1C212A' : '#F4F4F5',
                    borderColor: isDark ? '#313744' : '#E4E4E7',
                  },
                ]}>
                <Text style={[styles.footerPillText, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                  Service 24/7
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: 70,
    right: -60,
  },
  glowDark: {
    backgroundColor: 'rgba(255, 87, 5, 0.12)',
  },
  glowLight: {
    backgroundColor: 'rgba(255, 87, 5, 0.10)',
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 520,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 5, 0.12)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  brandPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  logo: {
    width: 176,
    height: 72,
    alignSelf: 'center',
    marginBottom: 20,
  },
  visualArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    minHeight: 210,
    position: 'relative',
  },
  visualHalo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 5, 0.18)',
  },
  metricCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 22,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: color.primary,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 30,
    flexWrap: 'wrap',
  },
  footerPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  footerPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: color.primary,
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  nextButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  doneButton: {
    borderRadius: 999,
    backgroundColor: color.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
