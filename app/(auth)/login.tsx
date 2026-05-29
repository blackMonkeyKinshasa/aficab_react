import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as ExpoLinking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthOnboardingSlider } from '@/components/my-ui/AuthOnboardingSlider';
import { Button, ButtonText } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormControl, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { InputOTP } from '@/components/ui/input-otp';
import { Text } from '@/components/ui/text';
import { color } from '@/constants/colors';
import { SUPPORT_EMAIL_URL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/constants/databaseEnum';
import { googleIosClientId, googleWebClientId } from '@/constants/env';
import { useAnalytics } from '@/lib/analytics';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (options: { webClientId: string; iosClientId?: string; scopes?: string[] }) => void;
    hasPlayServices: () => Promise<void>;
    signIn: () => Promise<unknown>;
  };
  GoogleSigninButton: React.ComponentType<any> & {
    Size: { Wide: number };
    Color: { Dark: number; Light: number };
  };
  isSuccessResponse: (response: unknown) => response is { data?: { idToken?: string | null } };
  statusCodes: {
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
};

type OAuthCallbackParams = {
  access_token?: string;
  refresh_token?: string;
  code?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
};

const NATIVE_AUTH_CALLBACK_URL = 'mobile://aficab.com/auth/callback';
const OTP_COOLDOWN_SECONDS = 120;

type OtpRequestResult = {
  ok: boolean;
  blocked?: boolean;
  retryAfterSeconds?: number;
};

function formatAppleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null | undefined
) {
  if (!fullName) {
    return '';
  }

  return [fullName.givenName, fullName.middleName, fullName.familyName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .trim();
}

WebBrowser.maybeCompleteAuthSession();

function hasNativeGoogleSigninModule() {
  const turboModuleRegistry =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- runtime probe for optional native module
    require('react-native/Libraries/TurboModule/TurboModuleRegistry').default;

  return Boolean(NativeModules?.RNGoogleSignin || turboModuleRegistry?.get?.('RNGoogleSignin'));
}

function loadNativeGoogleSigninModule(): GoogleSigninModule {
  const dynamicRequire = globalThis.eval?.('require');

  if (typeof dynamicRequire !== 'function') {
    throw new Error('Le chargeur natif Google Sign-In est indisponible dans cet environnement.');
  }

  return dynamicRequire('@react-native-google-signin/google-signin') as GoogleSigninModule;
}

function getOAuthCallbackParams(url: string): OAuthCallbackParams {
  const parsedUrl = ExpoLinking.parse(url);
  const queryParams = (parsedUrl.queryParams ?? {}) as Record<string, string | undefined>;
  const hashIndex = url.indexOf('#');
  const hashParams =
    hashIndex >= 0
      ? Object.fromEntries(new URLSearchParams(url.slice(hashIndex + 1)).entries())
      : {};

  return {
    ...queryParams,
    ...hashParams,
  };
}

async function signInWithNativeGoogleIdToken(nativeGoogleSigninModule: GoogleSigninModule) {
  await nativeGoogleSigninModule.GoogleSignin.hasPlayServices();

  const response = await nativeGoogleSigninModule.GoogleSignin.signIn();

  if (!nativeGoogleSigninModule.isSuccessResponse(response)) {
    return { user: null, errorMessage: null };
  }

  const idToken = response.data?.idToken;

  if (!idToken) {
    return { user: null, errorMessage: 'missing-id-token' };
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    return { user: null, errorMessage: error.message };
  }

  return { user: data.user ?? null, errorMessage: null };
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleSigninModule, setGoogleSigninModule] = useState<GoogleSigninModule | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [token, setToken] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpTimerCycle, setOtpTimerCycle] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const analytics = useAnalytics();
  const { t, tf } = useI18n();
  const toast = useAppToast();

  const isOtpCooldownActive = dialogOpen && otpCountdown > 0;

  const startOtpCountdown = (seconds = OTP_COOLDOWN_SECONDS) => {
    setOtpCountdown(seconds);
    setOtpTimerCycle((currentValue) => currentValue + 1);
  };

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    AsyncStorage.getItem('onboarding')
      .then((value) => {
        setShowOnboarding(value !== 'done');
      })
      .catch(() => {
        setShowOnboarding(false);
      });
  }, []);

  useEffect(() => {
    if (!hasNativeGoogleSigninModule()) {
      setGoogleSigninModule(null);
      return;
    }

    try {
      const nativeGoogleSignin = loadNativeGoogleSigninModule();

      setGoogleSigninModule(nativeGoogleSignin);

      if (googleWebClientId) {
        nativeGoogleSignin.GoogleSignin.configure({
          webClientId: googleWebClientId,
          iosClientId: googleIosClientId,
          scopes: ['profile', 'email'],
        });
      }
    } catch {
      setGoogleSigninModule(null);
    }
  }, []);

  useEffect(() => {
    if (otpTimerCycle === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setOtpCountdown((currentValue) => {
        if (currentValue <= 1) {
          clearInterval(intervalId);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [otpTimerCycle]);

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.openLinkError'),
        action: 'error',
      });
    }
  };

  const handleContactSupport = () => {
    Alert.alert(t('settings.contactUs'), t('auth.supportMessage'), [
      { text: t('settings.whatsapp'), onPress: () => handleOpenLink(SUPPORT_WHATSAPP_URL) },
      { text: t('settings.call'), onPress: () => handleOpenLink(`tel:${SUPPORT_PHONE}`) },
      { text: t('settings.email'), onPress: () => handleOpenLink(SUPPORT_EMAIL_URL) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleFinishOnboarding = async () => {
    await AsyncStorage.setItem('onboarding', 'done');
    setShowOnboarding(false);
  };

  const signInWithOTP = async (): Promise<OtpRequestResult> => {
    Keyboard.dismiss();

    const canRequestOtp = !dialogOpen || otpCountdown === 0;

    if (!canRequestOtp || loading) {
      return { ok: false, blocked: true };
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'mobile://aficab.com/',
      },
    });

    if (error) {
      const { message, retryAfterSeconds } = getAuthErrorMessage(error, t, tf);

      toast({
        title: t('common.error'),
        description: message,
        action: 'error',
        duration: 3500,
      });

      if (retryAfterSeconds) {
        startOtpCountdown(retryAfterSeconds);
      }

      setLoading(false);
      return { ok: false, retryAfterSeconds };
    }

    setDialogOpen(true);
    startOtpCountdown();
    setLoading(false);
    return { ok: true };
  };

  const handleResendOTP = async () => {
    if (otpCountdown > 0 || loading) {
      return;
    }

    setIsResending(true);
    await signInWithOTP();
    setIsResending(false);
  };

  const handleGoogleLogin = async () => {
    Keyboard.dismiss();
    const nativeGoogleSigninModule = googleSigninModule;

    if (!googleWebClientId) {
      toast({
        title: t('auth.configMissingTitle'),
        description: t('auth.configMissingMessage'),
        action: 'warning',
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (nativeGoogleSigninModule) {
        const { user, errorMessage } =
          await signInWithNativeGoogleIdToken(nativeGoogleSigninModule);

        if (errorMessage === 'missing-id-token') {
          setError(t('auth.googleInvalidToken'));
          return;
        }

        if (errorMessage) {
          setError(errorMessage);
          return;
        }

        if (!user) {
          return;
        }

        analytics.trackLogin(user.id ?? '', user.email ?? '', 'google');
        router.replace('/');
        return;
      }

      {
        const redirectTo = NATIVE_AUTH_CALLBACK_URL;

        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (oauthError) {
          setError(oauthError.message);
          return;
        }

        if (!data?.url) {
          setError(t('auth.googleOpenError'));
          return;
        }

        const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (authResult.type !== 'success' || !authResult.url) {
          setError(t('auth.googleCancelled'));
          return;
        }

        const callbackParams = getOAuthCallbackParams(authResult.url);

        if (callbackParams.error || callbackParams.error_code) {
          setError(callbackParams.error_description ?? t('auth.googleDenied'));
          return;
        }

        let sessionUser = null;

        if (callbackParams.code) {
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(callbackParams.code);

          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }

          sessionUser = exchangeData.session?.user ?? null;
        } else if (callbackParams.access_token && callbackParams.refresh_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: callbackParams.access_token,
            refresh_token: callbackParams.refresh_token,
          });

          if (sessionError) {
            setError(sessionError.message);
            return;
          }

          sessionUser = sessionData.user ?? null;
        } else {
          setError(t('auth.googleIncomplete'));
          return;
        }

        analytics.trackLogin(sessionUser?.id ?? '', sessionUser?.email ?? '', 'google');
        router.replace('/');
        return;
      }
    } catch (error: any) {
      if (error?.code === nativeGoogleSigninModule?.statusCodes.IN_PROGRESS) {
        setError(t('auth.googleInProgress'));
      } else if (
        error?.code === nativeGoogleSigninModule?.statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setError(t('auth.googlePlayServicesUnavailable'));
      } else {
        setError(error?.message ?? t('auth.googleImpossible'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setError('');

    try {
      if (Platform.OS === 'ios') {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          setError(t('auth.appleImpossible'));
          return;
        }

        const { data, error: authError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        const fullName = formatAppleFullName(credential.fullName);

        if (fullName || credential.fullName?.givenName || credential.fullName?.familyName) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              full_name: fullName || undefined,
              given_name: credential.fullName?.givenName ?? undefined,
              family_name: credential.fullName?.familyName ?? undefined,
            },
          });

          if (updateError) {
            console.warn('apple_metadata_update_failed', updateError);
          }
        }

        analytics.trackLogin(data.user?.id ?? '', data.user?.email ?? '', 'apple');
        router.replace('/');
        return;
      }

      const redirectTo = NATIVE_AUTH_CALLBACK_URL;

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (!data?.url) {
        setError(t('auth.appleOpenError'));
        return;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (authResult.type !== 'success' || !authResult.url) {
        setError(t('auth.appleCancelled'));
        return;
      }

      const callbackParams = getOAuthCallbackParams(authResult.url);

      if (callbackParams.error || callbackParams.error_code) {
        setError(callbackParams.error_description ?? t('auth.appleDenied'));
        return;
      }

      let sessionUser = null;

      if (callbackParams.code) {
        const { data: exchangeData, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(callbackParams.code);

        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }

        sessionUser = exchangeData.session?.user ?? null;
      } else if (callbackParams.access_token && callbackParams.refresh_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: callbackParams.access_token,
          refresh_token: callbackParams.refresh_token,
        });

        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        sessionUser = sessionData.user ?? null;
      } else {
        setError(t('auth.appleIncomplete'));
        return;
      }

      analytics.trackLogin(sessionUser?.id ?? '', sessionUser?.email ?? '', 'apple');
      router.replace('/');
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        setError(t('auth.appleCancelled'));
      } else {
        setError(error?.message ?? t('auth.appleImpossible'));
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (_token: string) => {
    setLoading(true);

    const {
      data: { session },
      error,
    } = await supabase.auth.verifyOtp({
      email: email,
      token: _token,
      type: 'email',
    });

    if (error) {
      const { message } = getAuthErrorMessage(error, t, tf);

      toast({
        title: t('common.error'),
        description: message,
        action: 'error',
        duration: 3500,
      });
      setLoading(false);
      console.log('error:', error);
      return;
    }

    if (session) {
      setDialogOpen(false);
      analytics.trackLogin(session.user?.id ?? '', session.user?.email ?? '', 'otp');
      router.replace('/');
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  if (showOnboarding === null) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-transparent"
        style={isDark ? { backgroundColor: color.appDarkBackground } : undefined}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={color.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-transparent"
        style={isDark ? { backgroundColor: color.appDarkBackground } : undefined}>
        <AuthOnboardingSlider onDone={handleFinishOnboarding} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-transparent"
      style={isDark ? { backgroundColor: color.appDarkBackground } : undefined}>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-between px-6 py-10">
          {/* Header */}
          <View>
            {/* Logo */}
            <View className="mb-8 flex-1 items-center justify-center">
              <View className="flex-row items-end">
                <Image
                  source={
                    isDark
                      ? require('@/assets/images/aficab-logo-white.png')
                      : require('@/assets/images/aficab-logo-black.png')
                  }
                  style={{ width: 150, height: 60, resizeMode: 'contain', marginLeft: 10 }}
                />
              </View>
            </View>

            {/* Description */}
            <Text className="mb-8 text-center text-base text-muted-foreground">
              {t('auth.description')}
            </Text>

            {/* Email Input */}
            <FormControl className="mb-8">
              <FormControlLabel className="mb-2">
                <FormControlLabelText className="text-typography-500">
                  {t('auth.emailLabel')}
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="control"
                className="bg-background-100 rounded-md border-0">
                <InputField
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    if (email && !loading && !isOtpCooldownActive) {
                      signInWithOTP();
                    }
                  }}
                />
              </Input>
            </FormControl>

            {/* Error Message */}
            {error ? <Text className="mb-4 text-center text-sm text-red-500">{error}</Text> : null}

            {/* Main Button */}

            <GetButtonDialog
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
              signInWithOTP={signInWithOTP}
              loading={loading}
              isResending={isResending}
              email={email}
              verifyOTP={verifyOTP}
              token={token}
              setToken={setToken}
              otpCountdown={otpCountdown}
              handleResendOTP={handleResendOTP}
              isOtpCooldownActive={isOtpCooldownActive}
              labels={{
                connecting: t('auth.connecting'),
                signUpOrLogin: t('auth.signUpOrLogin'),
                otpTitle: t('auth.otpTitle'),
                otpDescription: t('auth.otpDescription'),
                otpNotReceived: t('auth.otpNotReceived'),
                otpResendCode: t('auth.otpResendCode'),
                otpTimeRemaining: t('auth.otpTimeRemaining'),
                otpResendHint: t('auth.otpResendHint'),
                verify: t('auth.verify'),
                otpRequired: t('auth.otpRequired'),
              }}
            />

            {/* Divider */}
            <View className="mb-6 flex-row items-center">
              <View className="h-px flex-1 bg-gray-500 dark:bg-gray-600" />
              <Text className="mx-3 text-sm text-gray-900 dark:text-white">{t('auth.or')}</Text>
              <View className="h-px flex-1 bg-gray-500 dark:bg-gray-600" />
            </View>

            {/* Google Button */}
            <View className="mb-4 items-center">
              {googleSigninModule ? (
                <googleSigninModule.GoogleSigninButton
                  size={googleSigninModule.GoogleSigninButton.Size.Wide}
                  color={
                    isDark
                      ? googleSigninModule.GoogleSigninButton.Color.Dark
                      : googleSigninModule.GoogleSigninButton.Color.Light
                  }
                  onPress={handleGoogleLogin}
                  disabled={loading}
                  style={{ width: '100%', height: 48 }}
                />
              ) : (
                <Button
                  action="primary"
                  variant="outline"
                  size="control"
                  className="w-full rounded-md"
                  onPress={handleGoogleLogin}
                  isDisabled={loading}>
                  <View className="flex-row items-center justify-center">
                    <Image
                      source={require('@/assets/images/logo_google.png')}
                      style={{ width: 34, height: 34, resizeMode: 'contain' }}
                    />
                    <ButtonText className="text-typography-900 ml-3 text-base font-semibold">
                      {t('auth.googleContinue')}
                    </ButtonText>
                  </View>
                </Button>
              )}
            </View>
            {/* Apple Button */}

            {Platform.OS === 'ios' && (
              <Button
                action="primary"
                variant="outline"
                size="control"
                className="mb-8 rounded-md"
                onPress={handleAppleLogin}
                isDisabled={loading}>
                <View className="flex-row items-center justify-center">
                  <FontAwesome
                    name="apple"
                    size={24}
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                  />
                  <ButtonText className="text-typography-900 ml-3 text-base font-semibold">
                    {t('auth.appleContinue')}
                  </ButtonText>
                </View>
              </Button>
            )}
          </View>

          {/* Footer */}
          <View>
            {/* Terms Text */}
            <Text className="mb-6 text-xs leading-5 text-gray-600 dark:text-gray-400">
              {t('auth.legalPrefix')}{' '}
              <Link href="https://aficab.com/cgu" asChild>
                <Text className="mb-6 text-xs leading-5 text-primary">{t('auth.legalTerms')}</Text>
              </Link>{' '}
              {t('auth.legalMiddle')}{' '}
              <Link href="https://aficab.com/politique-de-confidentialite" asChild>
                <Text className="mb-6 text-xs leading-5 text-primary">
                  {t('auth.legalPrivacy')}
                </Text>
              </Link>
              {t('auth.legalSuffix')}
            </Text>

            {/* Support Text */}
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {t('auth.needHelp')}{' '}
              <Text className="text-xs text-primary" onPress={handleContactSupport}>
                {t('auth.contactSupport')}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GetButtonDialog({
  dialogOpen,
  setDialogOpen,
  signInWithOTP,
  loading,
  isResending,
  email,
  verifyOTP,
  token,
  setToken,
  otpCountdown,
  handleResendOTP,
  isOtpCooldownActive,
  labels,
}: {
  dialogOpen: boolean;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  signInWithOTP: () => Promise<OtpRequestResult> | void;
  loading?: boolean;
  isResending?: boolean;
  email?: string;
  verifyOTP?: (token: string) => void;
  token?: string;
  setToken?: React.Dispatch<React.SetStateAction<string>>;
  otpCountdown?: number;
  handleResendOTP?: () => void;
  isOtpCooldownActive?: boolean;
  labels?: {
    connecting: string;
    signUpOrLogin: string;
    otpTitle: string;
    otpDescription: string;
    otpNotReceived: string;
    otpResendCode: string;
    otpTimeRemaining: string;
    otpResendHint: string;
    verify: string;
    otpRequired: string;
  };
}) {
  const minutes = Math.floor((otpCountdown ?? 0) / 60);
  const seconds = (otpCountdown ?? 0) % 60;
  const formattedCountdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const canResend = (otpCountdown ?? 0) === 0 && !loading && !isResending;
  const resolvedLabels = {
    connecting: labels?.connecting ?? '',
    signUpOrLogin: labels?.signUpOrLogin ?? '',
    otpTitle: labels?.otpTitle ?? '',
    otpDescription: labels?.otpDescription ?? '',
    otpNotReceived: labels?.otpNotReceived ?? '',
    otpResendCode: labels?.otpResendCode ?? '',
    otpTimeRemaining: labels?.otpTimeRemaining ?? '',
    otpResendHint: labels?.otpResendHint ?? '',
    verify: labels?.verify ?? '',
    otpRequired: labels?.otpRequired ?? '',
  };

  const [buttonEnabled, setButtonEnabled] = useState(true);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!loading) {
      setButtonEnabled(true);
    }
  }, [loading]);

  const handleSignInPress = () => {
    void signInWithOTP();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          action="primary"
          variant="solid"
          size="control"
          onPress={handleSignInPress}
          isDisabled={loading || !email || isOtpCooldownActive}
          className="mb-6 w-full rounded-md">
          <ButtonText>
            {loading ? resolvedLabels.connecting : resolvedLabels.signUpOrLogin}
          </ButtonText>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-6">
        <DialogHeader className="items-center">
          <DialogTitle className="text-center text-xl font-bold">
            {resolvedLabels.otpTitle}
          </DialogTitle>
          <DialogDescription className="text-center">
            {resolvedLabels.otpDescription}
          </DialogDescription>
          {email ? (
            <Text className="text-center text-sm font-medium text-primary">{email}</Text>
          ) : null}
          {(otpCountdown ?? 0) > 0 ? (
            <>
              <Text className="text-center text-sm font-medium text-primary">
                {resolvedLabels.otpTimeRemaining} : {formattedCountdown}
              </Text>
              <Text className="text-center text-xs text-muted-foreground">
                {resolvedLabels.otpResendHint}
              </Text>
            </>
          ) : null}
        </DialogHeader>

        <View className="mx-auto w-full items-center gap-4">
          <InputOTP
            value={token}
            disabled={loading}
            onChange={(text) => {
              setValidationError('');
              setButtonEnabled(true);
              setToken?.(text);
            }}
            onComplete={(text) => {
              setButtonEnabled(false);
              Keyboard.dismiss();
              verifyOTP?.(text);
            }}
          />
          {validationError ? (
            <Text className="text-center text-sm text-red-500">{validationError}</Text>
          ) : null}

          <View className="items-center gap-1">
            <Text className="text-center text-sm text-muted-foreground">
              {resolvedLabels.otpNotReceived}
            </Text>
            {isResending ? (
              <ActivityIndicator size="small" color={color.primary} />
            ) : (
              <Pressable disabled={!canResend} onPress={handleResendOTP} hitSlop={8}>
                <Text
                  className={cn(
                    'text-center text-sm font-semibold underline',
                    canResend ? 'text-primary' : 'text-muted-foreground opacity-50'
                  )}>
                  {resolvedLabels.otpResendCode}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <DialogFooter className="w-full flex-col items-stretch sm:flex-col">
          <Button
            action="primary"
            variant="solid"
            size="control"
            className="w-full min-w-full self-stretch rounded-md"
            isDisabled={!buttonEnabled || loading}
            onPress={() => {
              setButtonEnabled(false);
              Keyboard.dismiss();
              if (token && token.length === 6) {
                verifyOTP?.(token);
              } else {
                setValidationError(resolvedLabels.otpRequired);
                setButtonEnabled(true);
              }
            }}>
            <ButtonText>{resolvedLabels.verify}</ButtonText>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
