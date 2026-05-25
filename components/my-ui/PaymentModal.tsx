import React, { memo, useMemo, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from 'react-native';

import { color } from '@/constants/colors';
import { PaymentMethod } from '@/constants/dataInterface';
import { useAnalytics } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';

interface Props {
  visible: boolean;
  isPremium: boolean;
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
  isActive,
  isDark,
  onPress,
}: {
  type: PaymentMethod;
  label: string;
  logo: number;
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
              ? '#1a3a25'
              : '#e8f5ec'
            : isDark
              ? '#2a2f35'
              : '#ffffff',
          borderColor: isActive ? '#04a24c' : isDark ? '#374151' : '#dddddd',
        },
      ]}
      onPress={() => onPress(type)}>
      <View style={styles.check}>{isActive && <View style={styles.innerCheck} />}</View>

      <Image source={logo} style={styles.logo} resizeMode="contain" fadeDuration={0} />
      <Text style={[styles.cardText, { color: isDark ? '#ffffff' : '#000000' }]}>{label}</Text>
    </TouchableOpacity>
  );
});

export function PaymentModal({
  visible,
  isPremium,
  disableStatusBar = false,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const containerBg = isDark ? color.appDarkBackground : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subTextColor = isDark ? '#A0A0A0' : '#555555';
  const inputBorder = isDark ? '#374151' : '#dddddd';
  const inputBg = isDark ? '#111827' : '#ffffff';
  const inputText = isDark ? '#ffffff' : '#000000';

  const [selected, setSelected] = useState<PaymentMethod>(PaymentMethod.mpesa);
  const [phone, setPhone] = useState('');
  const analytics = useAnalytics();
  const showPhoneField = selected !== PaymentMethod.cash && selected !== PaymentMethod.card;
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
        logo: PAYMENT_LOGOS[PaymentMethod.card],
      },
      ...(isPremium
        ? [
            {
              type: PaymentMethod.cash,
              label: t('payment.cash'),
              logo: PAYMENT_LOGOS[PaymentMethod.cash],
            },
          ]
        : []),
    ],
    [isPremium, t]
  );
  const selectedPaymentLabel =
    paymentOptions.find((option) => option.type === selected)?.label ?? t('payment.payWith');

  React.useEffect(() => {
    if (!visible) {
      setSelected(PaymentMethod.mpesa);
      setPhone('');
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={!disableStatusBar}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={submitting ? undefined : onClose}
        />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.modalCard, { backgroundColor: containerBg }]}>
            <Text style={[styles.title, { color: textColor }]}>{t('payment.title')}</Text>

            <View style={styles.grid}>
              {paymentOptions.map((option) => (
                <PaymentCard
                  key={option.type}
                  type={option.type}
                  label={option.label}
                  logo={option.logo}
                  isActive={selected === option.type}
                  isDark={isDark}
                  onPress={submitting ? () => undefined : setSelected}
                />
              ))}
            </View>

            {showPhoneField && (
              <>
                <Text style={[styles.label, { color: subTextColor, marginBottom: 15 }]}>
                  {t('payment.phoneInfoFor')} ({paymentLabel}) :
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={{ color: subTextColor, marginRight: 10 }}>+243</Text>
                  <TextInput
                    placeholder={t('payment.phonePlaceholder')}
                    placeholderTextColor={subTextColor}
                    value={phone}
                    onChangeText={setPhone}
                    style={[
                      styles.input,
                      { borderColor: inputBorder, backgroundColor: inputBg, color: inputText },
                    ]}
                    keyboardType="phone-pad"
                    editable={!submitting}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              disabled={submitting}
              onPress={() => {
                analytics.trackPaymentMethodSelected(selected, phone);
                analytics.trackPaymentSubmitted(selected);
                onSubmit(selected, phone);
              }}>
              <Text style={styles.buttonText}>
                {submitting
                  ? t('booking.paymentProcessing')
                  : `${t('payment.payWith')} ${selectedPaymentLabel}`}
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
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
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
    backgroundColor: '#04a24c',
  },
  logo: {
    width: 50,
    height: 30,
    marginVertical: 5,
  },
  cardText: {
    fontSize: 13,
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#ff6600',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  closeButton: {
    marginTop: 12,
  },
  closeText: {
    textAlign: 'center',
  },
});
