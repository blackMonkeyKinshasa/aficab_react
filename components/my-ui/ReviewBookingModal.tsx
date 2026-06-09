import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetScrollView,
} from '@/components/ui/actionsheet';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Booking } from '@/constants/dataInterface';
import { TranslationKey } from '@/lib/i18n';
import {
  dismissKeyboard,
  keyboardAvoidingBehavior,
  useKeyboardVisibility,
} from '@/lib/use-keyboard-visibility';

type ReviewValues = {
  ratingDriving: number;
  ratingPunctuality: number;
  ratingService: number;
  ratingVehicle: number;
  comment: string;
};

type ReviewBookingModalProps = {
  visible: boolean;
  booking: Booking | null;
  isDark: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: ReviewValues) => void;
  t: (key: TranslationKey) => string;
};

const INITIAL_VALUES: ReviewValues = {
  ratingDriving: 5,
  ratingPunctuality: 5,
  ratingService: 5,
  ratingVehicle: 5,
  comment: '',
};

function RatingField({
  label,
  value,
  onChange,
  isDark,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  isDark: boolean;
}) {
  return (
    <View style={styles.ratingBlock}>
      <Text style={[styles.ratingLabel, { color: isDark ? '#ffffff' : '#111827' }]}>{label}</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value;

          return (
            <TouchableOpacity
              key={star}
              onPress={() => onChange(star)}
              style={styles.starButton}
              activeOpacity={0.8}>
              <Ionicons
                name={active ? 'star' : 'star-outline'}
                size={26}
                color={active ? '#f59e0b' : isDark ? '#6b7280' : '#9ca3af'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function ReviewBookingModal({
  visible,
  booking,
  isDark,
  submitting,
  onClose,
  onSubmit,
  t,
}: ReviewBookingModalProps) {
  const [values, setValues] = useState<ReviewValues>(INITIAL_VALUES);
  const isKeyboardVisible = useKeyboardVisibility();

  useEffect(() => {
    if (visible) {
      setValues(INITIAL_VALUES);
    }
  }, [visible, booking?.id]);

  const handleClose = () => {
    dismissKeyboard();
    onClose();
  };

  const handleSubmit = () => {
    dismissKeyboard();
    onSubmit({
      ratingDriving: values.ratingDriving,
      ratingPunctuality: values.ratingPunctuality,
      ratingService: values.ratingService,
      ratingVehicle: values.ratingVehicle,
      comment: values.comment.trim(),
    });
  };

  const cardBg = isDark ? '#262626' : '#f3f4f6';
  const sub = isDark ? '#9ca3af' : '#6b7280';

  return (
    <Actionsheet isOpen={visible} onClose={handleClose} snapPoints={[85]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="max-h-[85%] px-0 pb-0">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={{ color: isDark ? '#ffffff' : '#111827', fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#111827' }]}>
            {t('reservations.reviewForm.title')}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={keyboardAvoidingBehavior}
          enabled={isKeyboardVisible}>
          <ActionsheetScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={isKeyboardVisible}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text
                style={[styles.bookingTitle, { color: isDark ? '#ffffff' : '#111827' }]}
                numberOfLines={1}>
                {booking?.car?.name ?? t('booking.noVehicle')}
              </Text>
              <Text style={[styles.bookingSubtitle, { color: sub }]} numberOfLines={2}>
                {booking?.departure?.label ?? t('booking.addressUnavailable')}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <RatingField
                label={t('reservations.field.driving')}
                value={values.ratingDriving}
                onChange={(ratingDriving) =>
                  setValues((current) => ({ ...current, ratingDriving }))
                }
                isDark={isDark}
              />
              <RatingField
                label={t('reservations.field.punctuality')}
                value={values.ratingPunctuality}
                onChange={(ratingPunctuality) =>
                  setValues((current) => ({ ...current, ratingPunctuality }))
                }
                isDark={isDark}
              />
              <RatingField
                label={t('reservations.field.service')}
                value={values.ratingService}
                onChange={(ratingService) =>
                  setValues((current) => ({ ...current, ratingService }))
                }
                isDark={isDark}
              />
              <RatingField
                label={t('reservations.field.vehicle')}
                value={values.ratingVehicle}
                onChange={(ratingVehicle) =>
                  setValues((current) => ({ ...current, ratingVehicle }))
                }
                isDark={isDark}
              />
            </View>

            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.commentLabel, { color: isDark ? '#ffffff' : '#111827' }]}>
                {t('reservations.reviewForm.commentLabel')}
              </Text>
              <Textarea
                value={values.comment}
                onChangeText={(comment) => setValues((current) => ({ ...current, comment }))}
                placeholder={t('reservations.reviewForm.commentPlaceholder')}
                editable={!submitting}
                style={{
                  minHeight: 120,
                  marginTop: 10,
                  color: isDark ? '#ffffff' : '#111827',
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderColor: isDark ? '#374151' : '#d1d5db',
                }}
                placeholderTextColor={sub}
              />
            </View>
          </ActionsheetScrollView>

          <View style={styles.footer}>
            <Button
              action="primary"
              variant="outline"
              size="control"
              className="flex-1 rounded-md"
              onPress={handleClose}
              isDisabled={submitting}>
              <ButtonText style={{ color: isDark ? '#ffffff' : '#111827', fontWeight: '600' }}>
                {t('common.cancel')}
              </ButtonText>
            </Button>
            <Button
              action="primary"
              variant="solid"
              size="control"
              className="flex-1 rounded-md"
              onPress={handleSubmit}
              isDisabled={submitting}>
              {submitting ? <ButtonSpinner color="#ffffff" /> : null}
              <ButtonText>{t('reservations.reviewForm.submit')}</ButtonText>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </ActionsheetContent>
    </Actionsheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: '100%',
  },
  headerButton: {
    width: 36,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    width: '100%',
    flex: 1,
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 14,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bookingSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  ratingBlock: {
    marginBottom: 14,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  starButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 8,
    width: '100%',
  },
});
