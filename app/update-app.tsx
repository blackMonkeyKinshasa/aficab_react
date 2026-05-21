import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { AlertTriangle, RefreshCw, ShieldCheck, Store } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo, useState } from 'react';
import { Linking, Platform, SafeAreaView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { WEBSITE_URL, getStoreUrl } from '@/constants/app-links';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useAppConfigState } from '@/store/app-config-state';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localVersion = useMemo(() => getLocalBuildVersion(), []);
  const storeUrl = useMemo(() => getStoreUrl(Platform.OS), []);
  const requiredVersion = appConfig?.version_client ?? '--';
  const statusLabel = appIsLock ? t('update.statusBlocked') : t('update.statusReady');

  const handleRetry = async () => {
    setErrorMessage(null);

    try {
      const result = await refreshAppConfig();

      if (!result.appIsLock) {
        router.replace('/');
      }
    } catch (error) {
      setErrorMessage(t('update.refreshError'));
      console.error('Erreur lors de la vérification de mise à jour:', error);
    }
  };

  const handleOpenStore = async () => {
    setErrorMessage(null);

    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      setErrorMessage(t('update.refreshError'));
      console.error('Erreur lors de l’ouverture du store:', error);
    }
  };

  return (
   <View className="flex-1 justify-center px-5">
  <View
    className="rounded-3xl border border-border bg-card px-5 py-6"
    style={{
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    }}
  >
    {/* HEADER */}
    <View className="items-center">
      <View
        className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color.primary}15` }}
      >
        <ShieldCheck color={color.primary} size={28} />
      </View>

      <Text className="text-2xl font-bold text-center text-foreground">
        {t('update.requiredTitle')}
      </Text>

      <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
        {t('update.requiredMessage')}
      </Text>
    </View>

    {/* STATUS */}
    <View
      className="mt-6 rounded-2xl px-4 py-3"
      style={{ backgroundColor: isDark ? '#1C2230' : '#FFF4ED' }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">
          {t('update.statusLabel')}
        </Text>

        <View
          className="rounded-full px-3 py-1"
          style={{
            backgroundColor: appIsLock
              ? `${color.primary}20`
              : '#16A34A20',
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{
              color: appIsLock ? color.primary : '#16A34A',
            }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
    </View>

    {/* VERSION INFO */}
    <View className="mt-5 gap-3 rounded-2xl bg-muted p-4">
      <View className="flex-row justify-between">
        <Text className="text-sm text-muted-foreground">
          {t('update.localVersion')}
        </Text>
        <Text className="font-semibold text-foreground">
          {localVersion}
        </Text>
      </View>

      <View className="h-px bg-border" />

      <View className="flex-row justify-between">
        <Text className="text-sm text-muted-foreground">
          {t('update.requiredVersion')}
        </Text>
        <Text className="font-semibold text-foreground">
          {requiredVersion}
        </Text>
      </View>
    </View>

    {/* ERROR */}
    {errorMessage && (
      <View className="mt-4 flex-row items-center rounded-xl bg-red-500/10 px-3 py-2">
        <AlertTriangle size={16} color="#DC2626" />
        <Text className="ml-2 flex-1 text-sm text-foreground">
          {errorMessage}
        </Text>
      </View>
    )}

    {/* BUTTONS */}
    <View className="mt-6 gap-3">
      <Button
        className="h-14 flex-row items-center justify-center rounded-2xl"
        style={{ backgroundColor: color.primary }}
        loading={refreshing}
        onPress={handleRetry}
      >
           <View className="flex-row items-center justify-center">
        <RefreshCw color="#fff" size={18} />
        <Text className="ml-2 text-base font-semibold text-white">
          {refreshing
            ? t('update.checking')
            : t('update.checkAgain')}
        </Text>
         </View>
      </Button>

      <Button
        className="h-14 flex-row items-center justify-center rounded-2xl border"
        variant="outline"
        onPress={handleOpenStore}
      >
        <View className="flex-row items-center justify-center">
                 <Store color={color.primary} size={18} />
        <Text
          className="ml-2 text-base font-semibold"
          style={{ color: color.primary }}
        >
          
          {t('update.button')}
        </Text>
        </View>
 
      </Button>
    </View>
  </View>
</View>
  );
}