import React, { memo, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { color } from '@/constants/colors';
import { PaymentMethod } from '@/constants/dataInterface';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import {
  dismissKeyboard,
  keyboardAvoidingBehavior,
  useKeyboardVisibility,
} from '@/lib/use-keyboard-visibility';

interface Props {
  visible: boolean;
  isPremium: boolean;
  amount?: number | null;
  disableStatusBar?: boolean;
  onSubmit: (paymentMethod: PaymentMethod, phoneNumber?: string) => void;
  onClose: () => void;
  submitting?: boolean;
}

const PAYMENT_LOGOS = {
  [PaymentMethod.mpesa]: require('@/assets/money/mpesa.png'),
  [PaymentMethod.orange]: require('@/assets/money/orange.png'),
  [PaymentMethod.airtel]: require('@/assets/money/airtel.png'),
  [PaymentMethod.card]: require('@/assets/money/visa.png'),
  [PaymentMethod.cash]: require('@/assets/money/cash.png'),
} as const;

const PaymentCard = memo(function PaymentCard({
  type,
  label,
  logo,
  subtitle,
  isActive,
  isDark,
  onPress,
}: {
  type: PaymentMethod;
  label: string;
  logo: number;
  subtitle?: string;
  isActive: boolean;
  isDark: boolean;
  onPress: (type: PaymentMethod) => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isActive
            ? isDark
              ? '#2A221C'
              : '#FFF4ED'
            : isDark
              ? '#232833'
              : '#ffffff',
          borderColor: isActive ? '#ff6600' : isDark ? '#374151' : '#E4E8F0',
        },
      ]}
      onPress={() => onPress(type)}>
      <View style={styles.check}>{isActive && <View style={styles.innerCheck} />}</View>

      <Image source={logo} style={styles.logo} resizeMode="contain" fadeDuration={0} />
      <Text style={[styles.cardText, { color: isDark ? '#ffffff' : '#000000' }]}>{label}</Text>
      {subtitle ? (
        <Text style={[styles.cardSubText, { color: isDark ? '#A0A0A0' : '#6B7280' }]}>{subtitle}</Text>
      ) : null}
    </TouchableOpacity>
  );
});

export function PaymentModal({
  visible,
  isPremium,
  amount = null,
  disableStatusBar = false,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const { t, tf, appLocale } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const containerBg = isDark ? '#111827' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';
  const isKeyboardVisible = useKeyboardVisibility();
  const analytics = useAnalytics();

  const [selected, setSelected] = useState<PaymentMethod>(PaymentMethod.mpesa);
  const [phone, setPhone] = useState('');
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);
  const showPhoneField = selected !== PaymentMethod.cash && selected !== PaymentMethod.card;
  const isPhoneValid = /^\d{9}$/.test(phone);
  const showPhoneError = showPhoneField && showPhoneValidation && !isPhoneValid;
  const paymentLabel =
    selected === PaymentMethod.mpesa
      ? t('payment.mpesa')
      : selected === PaymentMethod.orange
        ? t('payment.orange')
        : t('payment.airtel');

  const paymentOptions = useMemo(
    () => [
      {
        type: PaymentMethod.mpesa,
        label: t('payment.mpesa'),
        logo: PAYMENT_LOGOS[PaymentMethod.mpesa],
      },
      {
        type: PaymentMethod.orange,
        label: t('payment.orange'),
        logo: PAYMENT_LOGOS[PaymentMethod.orange],
      },
      {
        type: PaymentMethod.airtel,
        label: t('payment.airtel'),
        logo: PAYMENT_LOGOS[PaymentMethod.airtel],
      },
      {
        type: PaymentMethod.card,
        label: t('payment.card'),
        subtitle: 'Visa • Mastercard',
        logo: PAYMENT_LOGOS[PaymentMethod.card],
      },
      ...(isPremium
        ? [
            {
              type: PaymentMethod.cash,
              label: t('payment.payLater'),
              logo: PAYMENT_LOGOS[PaymentMethod.cash],
            },
          ]
        : []),
    ],
    [isPremium, t]
  );

  const selectedPaymentLabel = useMemo(() => {
    if (amount === null || Number.isNaN(amount)) return '--';
    return `${amount.toLocaleString(appLocale.startsWith('fr') ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;
  }, [amount, appLocale]);

  React.useEffect(() => {
    if (!visible) {
      setSelected(PaymentMethod.mpesa);
      setPhone('');
      setShowPhoneValidation(false);
      dismissKeyboard();
    }
  }, [visible]);

  const handleClose = () => {
    dismissKeyboard();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={!disableStatusBar}>
      <KeyboardAvoidingView
        behavior={keyboardAvoidingBehavior}
        enabled={isKeyboardVisible}
        style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={submitting ? undefined : handleClose} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.modalCard, { backgroundColor: containerBg }]}>
            <View style={styles.handle} />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={submitting ? undefined : handleClose}
              style={styles.closeButton}>
              <Ionicons name="close" size={22} color={subTextColor} />
            </TouchableOpacity>

            <Text style={[styles.title, { color: textColor }]}>{t('payment.choosePaymentMethod')}</Text>

            <View style={[styles.amountCard, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
              <Text style={[styles.amountLabel, { color: subTextColor }]}>{t('payment.amountToPay')}</Text>
              <Text style={styles.amountValue}>{selectedPaymentLabel}</Text>
            </View>

            <View style={styles.grid}>
              {paymentOptions.map((option) => (
                <PaymentCard
                  key={option.type}
                  type={option.type}
                  label={option.label}
                  logo={option.logo}
                  subtitle={option.subtitle}
                  isActive={selected === option.type}
                  isDark={isDark}
                  onPress={submitting ? () => undefined : setSelected}
                />
              ))}
            </View>

            {showPhoneField ? (
              <>
                <Text style={[styles.label, { color: textColor, marginBottom: 8 }]}>
                  {tf('payment.phoneNumberFor', { provider: paymentLabel })}
                </Text>

                {showPhoneError && (
                  <Text style={styles.phoneErrorText}>{t('payment.phoneFormatError')}</Text>
                )}

                <View style={styles.phoneInputWrapper}>
                  <View style={[styles.phoneRow, { borderColor: isDark ? '#374151' : '#D1D5DB' }]}>
                    <Text style={[styles.phonePrefix, { color: textColor }]}>+243</Text>
                    <TextInput
                      value={phone}
                      onChangeText={(value) => {
                        const sanitizedValue = value.replace(/\D/g, '').slice(0, 9);
                        setPhone(sanitizedValue);
                      }}
                      placeholder={t('payment.phonePlaceholderShort')}
                      placeholderTextColor={subTextColor}
                      keyboardType="phone-pad"
                      editable={!submitting}
                      returnKeyType="done"
                      style={[styles.phoneInput, { color: textColor }]}
                    />
                  </View>
                  <Text style={[styles.phoneHelp, { color: subTextColor }]}>
                    {tf('payment.phoneHintFor', { provider: paymentLabel })}
                  </Text>
                </View>
              </>
            ) : null}

            {showPhoneField ? (
              <View style={[styles.validationBox, { backgroundColor: isDark ? '#332015' : '#FFF4ED' }]}>
                <Ionicons name="phone-portrait-outline" size={18} color="#ff6600" />
                <Text style={styles.validationText}>{t('payment.validateOnPhone')}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              disabled={submitting}
              onPress={() => {
                if (showPhoneField && !isPhoneValid) {
                  setShowPhoneValidation(true);
                  return;
                }

                analytics.trackPaymentMethodSelected(selected, phone);
                analytics.trackPaymentSubmitted(selected);
                onSubmit(selected, phone);
              }}>
              <Text style={styles.buttonText}>
                {submitting
                  ? t('booking.paymentProcessing')
                  : `${t('payment.pay')} ${selectedPaymentLabel}`}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'left',
  },
  amountCard: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  amountValue: {
    color: '#ff6600',
    fontSize: 20,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E4E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    minHeight: 104,
  },
  check: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#aaa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6600',
  },
  logo: {
    width: 62,
    height: 36,
    marginVertical: 6,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardSubText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInputWrapper: {
    marginBottom: 8,
  },
  phoneRow: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '600',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  phoneHelp: {
    marginTop: 8,
    fontSize: 13,
  },
  validationBox: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  phoneErrorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 8,
  },
  validationText: {
    color: '#E25507',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    backgroundColor: '#ff6600',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
