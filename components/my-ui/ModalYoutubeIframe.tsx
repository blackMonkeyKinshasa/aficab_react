import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from 'nativewind';
import YoutubePlayer from 'react-native-youtube-iframe';

import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';

type ModalYoutubeIframeProps = {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  title?: string;
  height?: number;
  play?: boolean;
};

export function ModalYoutubeIframe({
  visible,
  onClose,
  videoId,
  title = 'Video',
  height = 220,
  play = false,
}: ModalYoutubeIframeProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[styles.card, { backgroundColor: isDark ? color.appDarkBackground : '#FFFFFF' }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {t('common.close')}
              </Text>
            </TouchableOpacity>
          </View>

          <YoutubePlayer height={height} play={play} videoId={videoId} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
