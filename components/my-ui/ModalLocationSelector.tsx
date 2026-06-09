import { useCallback, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { IconButton } from 'react-native-paper';

import { BookingSheetLayout } from '@/components/my-ui/BookingSheetLayout';
import { LocationSearchRow, LocationSectionLabel } from '@/components/my-ui/LocationSearchRow';
import { Location } from '@/constants/constants';
import { bookingSpacing } from '@/constants/spacing';
import { useFieldThemeColors } from '@/lib/field-theme';
import { useI18n } from '@/lib/i18n';
import { useMyStateLocation } from '@/store/location-state';

import { LocationSelector } from './LocationSelector';

export function ModalLocationSelector({
  visible,
  onDismiss,
  onConfirm,
}: {
  visible: boolean | undefined;
  onDismiss: () => any;
  onConfirm: (location: Location) => void;
}) {
  const { t } = useI18n();
  const themeColors = useFieldThemeColors();

  const [searchQuery, setSearchQuery] = useState('');
  const { recentLocations, removeLocation } = useMyStateLocation();
  const isSearching = searchQuery.trim().length >= 2;

  const handleSelectLocation = useCallback(
    (nextLocation: Location) => {
      Keyboard.dismiss();
      setSearchQuery('');

      requestAnimationFrame(() => {
        onConfirm(nextLocation);
      });
    },
    [onConfirm]
  );

  const footerActions = useMemo(
    () => [
      {
        label: t('common.cancel'),
        onPress: onDismiss,
        variant: 'outline' as const,
      },
    ],
    [onDismiss, t]
  );

  return (
    <BookingSheetLayout
      visible={!!visible}
      onDismiss={onDismiss}
      title={t('booking.searchAddress')}
      footerActions={footerActions}>
      <View className="w-full py-2" style={{ paddingHorizontal: bookingSpacing.screenPaddingX }}>
        <LocationSelector
          onSelect={(selectedLocation) => {
            handleSelectLocation(selectedLocation);
          }}
          onQueryChange={setSearchQuery}
        />

        {!isSearching && recentLocations.length > 0 ? (
          <View>
            <View
              style={[modalLocationStyles.divider, { backgroundColor: themeColors.separator }]}
            />
            <LocationSectionLabel>{t('booking.recentLocations')}</LocationSectionLabel>
            {recentLocations.map((loc) => (
              <LocationSearchRow
                key={loc.description}
                title={loc.description}
                icon="location"
                onPress={() => {
                  handleSelectLocation(loc);
                }}
                trailing={
                  <IconButton
                    icon="close"
                    size={20}
                    iconColor={themeColors.listItemSubText}
                    onPress={() => {
                      removeLocation(loc);
                    }}
                  />
                }
              />
            ))}
          </View>
        ) : null}
      </View>
    </BookingSheetLayout>
  );
}

const modalLocationStyles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
    marginBottom: 4,
  },
});
