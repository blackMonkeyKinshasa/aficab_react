import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { Platform, SafeAreaView, View, Linking } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { useAppConfigState } from '@/store/app-config-state';
import { useI18n } from '@/lib/i18n';

function getLocalBuildVersion() {
  if (Application.nativeBuildVersion) {
    return Application.nativeBuildVersion;
  }

  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.ios?.buildNumber ?? '0';
  }

  return String(Constants.expoConfig?.android?.versionCode ?? '0');
}

export default function UpdateAppScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const appConfig = useAppConfigState((state) => state.appConfig);
  const appIsLock = useAppConfigState((state) => state.appIsLock);
  const refreshAppConfig = useAppConfigState((state) => state.refreshAppConfig);
  const refreshing = useAppConfigState((state) => state.refreshing);
  const { t } = useI18n();

  const localVersion = useMemo(() => getLocalBuildVersion(), []);

  const handleRetry = async () => {
    try {
      const result = await refreshAppConfig();

      if (!result.appIsLock) {
        router.replace('/');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de mise à jour:', error);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-transparent"
      style={isDark ? { backgroundColor: color.appDarkBackground } : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <View className="rounded-3xl border border-border bg-card p-6">
          <Text className="text-2xl font-bold text-foreground">{t('update.requiredTitle')}</Text>
          <Text className="mt-3 text-base leading-6 text-muted-foreground">
            {t('update.requiredMessage')}
          </Text>

          <View className="mt-6 rounded-2xl bg-muted p-4">
            <Text className="text-sm text-muted-foreground">{t('update.localVersion')}</Text>
            <Text className="mt-1 text-lg font-semibold text-foreground">{localVersion}</Text>

            <Text className="mt-4 text-sm text-muted-foreground">{t('update.requiredVersion')}</Text>
            <Text className="mt-1 text-lg font-semibold text-foreground">
              {appConfig?.version_client ?? '--'}
            </Text>

            <Text className="mt-4 text-sm text-muted-foreground">{t('update.appLocked')}</Text>
            <Text className="mt-1 text-lg font-semibold text-foreground">
              {appIsLock ? t('common.yes') : t('common.no')}
            </Text>
          </View>

          <Button className="mt-6 h-12 rounded-lg bg-orange-500" disabled={refreshing} onPress={handleRetry}>
            <Text className="font-bold text-white">
              {refreshing ? t('update.checking') : t('update.checkAgain')}
            </Text>
          </Button>

          <Button
            className="mt-3 h-12 rounded-lg bg-primary"
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('https://apps.apple.com/app/id6467031107');
              } else {
                Linking.openURL('https://play.google.com/store/apps/details?id=io.kinvtc.mapstracking');
              }
            }}
          >
            <Text className="font-bold text-white">{t('update.button')}</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}