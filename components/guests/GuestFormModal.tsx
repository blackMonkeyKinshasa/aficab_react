import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { SavedGuest, SavedGuestInput } from '@/store/guests-state';

type GuestFormModalProps = {
  visible: boolean;
  isDark: boolean;
  initialGuest?: SavedGuest | null;
  /** Prefill after contact import (or draft restore). */
  prefill?: Partial<SavedGuestInput> | null;
  importingContact?: boolean;
  onClose: () => void;
  onImportFromContacts: () => void;
  onSubmit: (input: SavedGuestInput) => void;
};

export function GuestFormModal({
  visible,
  isDark,
  initialGuest,
  prefill,
  importingContact = false,
  onClose,
  onImportFromContacts,
  onSubmit,
}: GuestFormModalProps) {
  const { t } = useI18n();
  const { s, font } = useLayoutScale();

  // Initialized from props — parent remounts this modal via `key` after contact import.
  const [fullName, setFullName] = useState(
    () => prefill?.fullName ?? initialGuest?.fullName ?? ''
  );
  const [phone, setPhone] = useState(() => prefill?.phone ?? initialGuest?.phone ?? '');
  const [email, setEmail] = useState(
    () => prefill?.email ?? initialGuest?.email ?? ''
  );
  const [note, setNote] = useState(() => prefill?.note ?? initialGuest?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? '#1E1E1E' : '#ffffff';
  const fg = isDark ? '#ffffff' : '#111827';
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? '#333' : '#E5E7EB';
  const fieldBg = isDark ? '#262626' : '#F9FAFB';
  const isEdit = Boolean(initialGuest);

  const handleSave = () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError(t('guests.validationName'));
      return;
    }
    if (!trimmedPhone) {
      setError(t('guests.validationPhone'));
      return;
    }

    onSubmit({
      fullName: trimmedName,
      phone: trimmedPhone,
      email: email.trim() || null,
      note: note.trim() || null,
    });
  };

  const fieldStyle = {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: fg,
    backgroundColor: fieldBg,
    fontSize: font.sm,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: bg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '88%',
          }}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled">
            <Text style={{ color: fg, fontSize: font.lg, fontWeight: '700' }}>
              {isEdit ? t('guests.editTitle') : t('guests.createTitle')}
            </Text>
            <Text style={{ color: sub, marginTop: 6, fontSize: font.sm }}>
              {t('guests.formHint')}
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={importingContact}
              onPress={onImportFromContacts}
              style={{
                marginTop: 16,
                marginBottom: 4,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 12,
                paddingVertical: 12,
                opacity: importingContact ? 0.6 : 1,
                backgroundColor: fieldBg,
              }}>
              {importingContact ? (
                <ActivityIndicator size="small" color={color.primary} />
              ) : (
                <Ionicons name="people-outline" size={s(18)} color={color.primary} />
              )}
              <Text
                style={{
                  marginLeft: 8,
                  color: color.primary,
                  fontWeight: '700',
                  fontSize: font.sm,
                }}>
                {importingContact
                  ? t('guests.importingContact')
                  : t('booking.importFromContacts')}
              </Text>
            </Pressable>

            <Text style={{ color: sub, marginTop: 16, marginBottom: 6, fontSize: font.sm }}>
              {t('booking.fullName')}
            </Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('booking.fullName')}
              placeholderTextColor={sub}
              style={fieldStyle}
            />

            <Text style={{ color: sub, marginTop: 12, marginBottom: 6, fontSize: font.sm }}>
              {t('booking.phoneNumber')}
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t('booking.phoneNumber')}
              placeholderTextColor={sub}
              keyboardType="phone-pad"
              style={fieldStyle}
            />

            <Text style={{ color: sub, marginTop: 12, marginBottom: 6, fontSize: font.sm }}>
              {t('guests.emailOptional')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('guests.emailOptional')}
              placeholderTextColor={sub}
              keyboardType="email-address"
              autoCapitalize="none"
              style={fieldStyle}
            />

            <Text style={{ color: sub, marginTop: 12, marginBottom: 6, fontSize: font.sm }}>
              {t('guests.noteOptional')}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('guests.noteOptional')}
              placeholderTextColor={sub}
              style={fieldStyle}
            />

            {error ? (
              <Text style={{ color: '#EF4444', marginTop: 10, fontSize: font.sm }}>{error}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Button className="h-11 flex-1 rounded-xl bg-gray-200" onPress={onClose}>
                <Text style={{ fontWeight: '700', color: '#111827' }}>{t('common.cancel')}</Text>
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl"
                style={{ backgroundColor: color.primary }}
                onPress={handleSave}>
                <Text style={{ fontWeight: '700', color: '#ffffff' }}>{t('common.save')}</Text>
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
