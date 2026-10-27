import { Pressable, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useLayoutScale } from '@/lib/layout-scale';
import { SavedGuest } from '@/store/guests-state';

type SavedGuestsPickerProps = {
  guests: SavedGuest[];
  selectedId?: string | null;
  onSelect: (guest: SavedGuest) => void;
  onManagePress?: () => void;
};

export function SavedGuestsPicker({
  guests,
  selectedId,
  onSelect,
  onManagePress,
}: SavedGuestsPickerProps) {
  const { t } = useI18n();
  const { s, font } = useLayoutScale();

  if (guests.length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onManagePress}
        className="mb-3 flex-row items-center rounded-xl border border-dashed border-outline-100 px-3 py-3 active:opacity-80">
        <Ionicons name="person-add-outline" size={s(18)} color={color.primary} />
        <Text className="ml-2 font-medium" style={{ color: color.primary, fontSize: font.sm }}>
          {t('guests.addFromSettings')}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="mb-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-medium text-typography-900" style={{ fontSize: font.sm }}>
          {t('guests.savedListTitle')}
        </Text>
        {onManagePress ? (
          <Pressable onPress={onManagePress} hitSlop={8}>
            <Text style={{ color: color.primary, fontSize: font.sm, fontWeight: '600' }}>
              {t('guests.manage')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {guests.map((guest) => {
          const selected = guest.id === selectedId;
          return (
            <Pressable
              key={guest.id}
              onPress={() => onSelect(guest)}
              className="rounded-xl border px-3 py-2 active:opacity-80"
              style={{
                borderColor: selected ? color.primary : '#E5E7EB',
                backgroundColor: selected ? '#FFF4EE' : 'transparent',
                minWidth: 140,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  fontWeight: '700',
                  fontSize: font.sm,
                  color: selected ? color.primary : '#111827',
                }}>
                {guest.fullName}
              </Text>
              <Text numberOfLines={1} style={{ marginTop: 2, fontSize: font.xs, color: '#6B7280' }}>
                {guest.phone}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
