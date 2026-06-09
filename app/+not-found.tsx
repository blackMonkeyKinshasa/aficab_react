import { View } from 'react-native';

import { Link, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

export default function NotFoundScreen() {
  const { t } = useI18n();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <Stack.Screen
        options={buildStackScreenOptions({
          title: t('notFound.title'),
          isDark,
          canGoBack: true,
        })}
      />
      <View>
        <Text>{t('notFound.message')}</Text>

        <Link href="/">
          <Text>{t('notFound.goHome')}</Text>
        </Link>
      </View>
    </>
  );
}
