import { useMemo } from 'react';
import { useColorScheme, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { BillingList } from '@/components/reservation/BillingList';
import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import { useBookings } from '@/hooks/queries/useBookings';
import { useI18n } from '@/lib/i18n';
import { useMyStateUser } from '@/store/user-state';

type UserStoreState = ReturnType<typeof useMyStateUser.getState>;

export default function BillingScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const params = useLocalSearchParams() as { id?: string | string[] };
  const highlightId = params.id;
  const userId = useMyStateUser((state: UserStoreState) => state.user?.id);
  const { data, isLoading } = useBookings(userId);

  const bookings = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    const focusId = Array.isArray(highlightId) ? highlightId[0] : highlightId;

    if (!focusId) {
      return list;
    }

    return [...list].sort((a, b) => {
      if (a.id === focusId) return -1;
      if (b.id === focusId) return 1;
      return 0;
    });
  }, [data, highlightId]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
      <Stack.Screen
        options={buildStackScreenOptions({
          title: t('billing.title'),
          isDark,
          canGoBack: true,
          onBack: () => router.back(),
        })}
      />
      <BillingList
        bookings={bookings}
        isDark={isDark}
        isLoading={isLoading}
        highlightId={Array.isArray(highlightId) ? highlightId[0] : highlightId}
      />
    </View>
  );
}
