import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

import { GuestFormModal } from '@/components/guests/GuestFormModal';
import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import { Button } from '@/components/ui/button';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { ContactPickError, pickGuestFromContacts } from '@/lib/pick-contact';
import { useAppToast } from '@/lib/toast';
import {
  SavedGuest,
  SavedGuestInput,
  useGuestsState,
} from '@/store/guests-state';

type GuestsStoreState = ReturnType<typeof useGuestsState.getState>;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function GuestsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useAppToast();
  const isDark = useColorScheme() === 'dark';
  const { s, font } = useLayoutScale();
  const guests = useGuestsState((state: GuestsStoreState) => state.guests);
  const addGuest = useGuestsState((state: GuestsStoreState) => state.addGuest);
  const updateGuest = useGuestsState((state: GuestsStoreState) => state.updateGuest);
  const removeGuest = useGuestsState((state: GuestsStoreState) => state.removeGuest);
  const findDuplicate = useGuestsState((state: GuestsStoreState) => state.findDuplicate);

  const [formVisible, setFormVisible] = useState(false);
  const [editingGuest, setEditingGuest] = useState<SavedGuest | null>(null);
  const [prefill, setPrefill] = useState<Partial<SavedGuestInput> | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [importingContact, setImportingContact] = useState(false);

  const sortedGuests = useMemo(
    () =>
      [...guests].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
      ),
    [guests]
  );

  const bg = isDark ? '#000' : '#fff';
  const cardBg = isDark ? '#1E1E1E' : '#ffffff';
  const borderColor = isDark ? '#2F2F2F' : '#E5E7EB';
  const fg = isDark ? '#fff' : '#111827';
  const sub = isDark ? '#9CA3AF' : '#6B7280';

  const openCreate = () => {
    setEditingGuest(null);
    setPrefill(null);
    setFormSession((value) => value + 1);
    setFormVisible(true);
  };

  const openEdit = (guest: SavedGuest) => {
    setEditingGuest(guest);
    setPrefill(null);
    setFormSession((value) => value + 1);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingGuest(null);
    setPrefill(null);
  };

  /**
   * Native contact picker cannot present reliably over an RN Modal.
   * Close the sheet first, pick, then remount the form with autofilled fields.
   */
  const handleImportFromContacts = async () => {
    const guestBeingEdited = editingGuest;
    setImportingContact(true);
    setFormVisible(false);

    try {
      await wait(400);
      const picked = await pickGuestFromContacts();

      if (!picked) {
        setEditingGuest(guestBeingEdited);
        setFormSession((value) => value + 1);
        setFormVisible(true);
        return;
      }

      setEditingGuest(guestBeingEdited);
      setPrefill({
        fullName: picked.fullName,
        phone: picked.phone,
        email: picked.email || null,
        note: guestBeingEdited?.note ?? null,
      });
      setFormSession((value) => value + 1);
      setFormVisible(true);

      if (!picked.fullName && !picked.phone) {
        toast({
          title: t('common.information'),
          description: t('booking.contactImportFailed'),
          action: 'info',
        });
      } else if (!picked.phone) {
        toast({
          title: t('common.information'),
          description: t('booking.contactImportPhoneMissing'),
          action: 'info',
        });
      }
    } catch (error) {
      setEditingGuest(guestBeingEdited);
      setFormSession((value) => value + 1);
      setFormVisible(true);

      if (error instanceof ContactPickError) {
        toast({
          title: error.code === 'unsupported' ? t('common.information') : t('common.error'),
          description:
            error.code === 'unsupported'
              ? t('booking.contactImportUnsupported')
              : error.code === 'permission_denied'
                ? t('booking.contactImportPermissionDenied')
                : t('booking.contactImportFailed'),
          action: error.code === 'unsupported' ? 'info' : 'error',
        });
        return;
      }

      toast({
        title: t('common.error'),
        description:
          error instanceof Error && error.message
            ? error.message
            : t('booking.contactImportFailed'),
        action: 'error',
      });
    } finally {
      setImportingContact(false);
    }
  };

  const handleSubmit = (input: SavedGuestInput) => {
    const duplicate = findDuplicate(input, editingGuest?.id);
    if (duplicate) {
      toast({
        title: t('common.error'),
        description: t('guests.duplicateError'),
        action: 'error',
      });
      return;
    }

    if (editingGuest) {
      updateGuest(editingGuest.id, input);
      toast({
        title: t('guests.title'),
        description: t('guests.updated'),
        action: 'success',
      });
    } else {
      addGuest(input);
      toast({
        title: t('guests.title'),
        description: t('guests.created'),
        action: 'success',
      });
    }

    closeForm();
  };

  const handleDelete = (guest: SavedGuest) => {
    Alert.alert(t('guests.deleteTitle'), t('guests.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeGuest(guest.id);
          toast({
            title: t('guests.title'),
            description: t('guests.deleted'),
            action: 'success',
          });
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen
        options={buildStackScreenOptions({
          title: t('guests.title'),
          isDark,
          canGoBack: true,
          onBack: () => router.back(),
        })}
      />

      <FlatList
        data={sortedGuests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <Ionicons name="people-outline" size={s(42)} color={sub} />
            <Text style={{ color: fg, marginTop: 12, fontWeight: '700', fontSize: font.base }}>
              {t('guests.emptyTitle')}
            </Text>
            <Text style={{ color: sub, marginTop: 6, textAlign: 'center', fontSize: font.sm }}>
              {t('guests.emptyDescription')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor,
            }}>
            <Text style={{ color: fg, fontWeight: '700', fontSize: font.base }}>{item.fullName}</Text>
            <Text style={{ color: sub, marginTop: 4, fontSize: font.sm }}>{item.phone}</Text>
            {item.email ? (
              <Text style={{ color: sub, marginTop: 2, fontSize: font.sm }}>{item.email}</Text>
            ) : null}
            {item.note ? (
              <Text style={{ color: sub, marginTop: 6, fontSize: font.sm }}>{item.note}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => openEdit(item)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#3D241C' : '#FFF4EE',
                  paddingVertical: 10,
                  alignItems: 'center',
                }}>
                <Text style={{ color: color.primary, fontWeight: '700' }}>{t('guests.editAction')}</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#3F1D1D' : '#FEF2F2',
                  paddingVertical: 10,
                  alignItems: 'center',
                }}>
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>{t('common.delete')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 24,
        }}>
        <Button
          className="h-12 rounded-xl"
          style={{ backgroundColor: color.primary }}
          onPress={openCreate}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('guests.createAction')}</Text>
        </Button>
      </View>

      <GuestFormModal
        key={`guest-form-${formSession}`}
        visible={formVisible}
        isDark={isDark}
        initialGuest={editingGuest}
        prefill={prefill}
        importingContact={importingContact}
        onClose={closeForm}
        onImportFromContacts={() => void handleImportFromContacts()}
        onSubmit={handleSubmit}
      />
    </View>
  );
}
