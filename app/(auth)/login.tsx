import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Link, Stack, useRouter } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { MoonStarIcon, StarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Alert, Image, Keyboard, Linking, NativeModules, type ImageStyle, View } from 'react-native';
import { TextInput, TouchableOpacity, ScrollView } from 'react-native';
import {  SafeAreaView } from 'react-native-safe-area-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome from '@expo/vector-icons/FontAwesome';


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { googleWebClientId } from '@/constants/env';
import { useEffect, useState } from 'react';
import { useAnalytics } from '@/lib/analytics';
import { Snackbar } from 'react-native-paper';
import { SUPPORT_EMAIL_URL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/constants/databaseEnum';
import { color } from '@/constants/colors';
import { useI18n } from '@/lib/i18n';

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (options: { webClientId: string }) => void;
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

WebBrowser.maybeCompleteAuthSession();

function hasNativeGoogleSigninModule() {
  const turboModuleRegistry = require('react-native/Libraries/TurboModule/TurboModuleRegistry').default;

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
  const hashParams = hashIndex >= 0
    ? Object.fromEntries(new URLSearchParams(url.slice(hashIndex + 1)).entries())
    : {};

  return {
    ...queryParams,
    ...hashParams,
  };
}

export default function LoginScreen() {
 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleSigninModule, setGoogleSigninModule] = useState<GoogleSigninModule | null>(null);
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [token, setToken] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(120);
  const [otpTimerCycle, setOtpTimerCycle] = useState(0);
  const analytics = useAnalytics(); 
  const { t } = useI18n();

  const isDark = colorScheme === 'dark';

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
        });
      }
    } catch {
      setGoogleSigninModule(null);
    }
  }, []);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    setOtpCountdown(120);

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
  }, [dialogOpen, otpTimerCycle]);

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('settings.openLinkError'));
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      t('settings.contactUs'),
      t('auth.supportMessage'),
      [
        { text: t('settings.whatsapp'), onPress: () => handleOpenLink(SUPPORT_WHATSAPP_URL) },
        { text: t('settings.call'), onPress: () => handleOpenLink(`tel:${SUPPORT_PHONE}`) },
        { text: t('settings.email'), onPress: () => handleOpenLink(SUPPORT_EMAIL_URL) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };


  const handleEmailLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: err, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        analytics.trackLogin(data.user?.id ?? '', email, null);
        router.replace('/');
      }
    } catch (err) {
      setError(t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        setError(t('auth.checkEmailConfirm'));
      }
    } catch (err) {
      setError(t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const signInWithOTP = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // set this to false if you do not want the user to be automatically signed up
        shouldCreateUser: true,
        emailRedirectTo: `mobile://aficab.com`,
      },
    });

    if (error){
      setDialogOpen(false);
      Alert.alert(error.message);
      console.log(error);
    }
    setLoading(false);
  }

  const handleResendOTP = async () => {
    setOtpCountdown(120);
    setOtpTimerCycle((currentValue) => currentValue + 1);
    await signInWithOTP();
  };

  const handleGoogleLogin = async () => {
    const nativeGoogleSigninModule = googleSigninModule;

    if (!googleWebClientId) {
      Alert.alert(t('auth.configMissingTitle'), t('auth.configMissingMessage'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!nativeGoogleSigninModule) {
        const redirectTo = ExpoLinking.createURL('/');

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
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(callbackParams.code);

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

      await nativeGoogleSigninModule.GoogleSignin.hasPlayServices();
      const response = await nativeGoogleSigninModule.GoogleSignin.signIn();

      if (!nativeGoogleSigninModule.isSuccessResponse(response)) {
        return;
      }

      const idToken = response.data?.idToken;

      if (!idToken) {
        setError(t('auth.googleInvalidToken'));
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      analytics.trackLogin(data.user?.id ?? '', data.user?.email ?? '', 'google');
      router.replace('/');
    } catch (error: any) {
      if (error?.code === nativeGoogleSigninModule?.statusCodes.IN_PROGRESS) {
        setError(t('auth.googleInProgress'));
      } else if (error?.code === nativeGoogleSigninModule?.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError(t('auth.googlePlayServicesUnavailable'));
      } else {
        setError(error?.message ?? t('auth.googleImpossible'));
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async ( _token: string) => {
  

    const {data: { session },error,} = await supabase.auth.verifyOtp({
      email: email,
      token: _token,
      type: 'email',
    });

    
    if (error) {
      setSnackbarMessage(error.message);
      setSnackbarVisible(true);
      setLoading(false);
      console.log('error:', error);

    }

    if (session) {
    //  Alert.alert('Success', 'You have been signed in successfully!');
    //router.push('../index');
        setDialogOpen(false);
      console.log('Session:', session);
      setLoading(false);
     
    }

  }

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-transparent"
      style={isDark ? { backgroundColor: color.appDarkBackground } : undefined}
    >
      <ScrollView className="flex-1">
      <View className="flex-1 px-6 py-10 justify-between">
        
        {/* Header */}
        <View>
          {/* Logo */}
          <View className="items-center flex-1 justify-center  mb-8">
            <View className="flex-row items-end">
             <Image source={isDark ? require('@/assets/images/aficab-logo-white.png') : require('@/assets/images/aficab-logo-black.png')}
                style={{ width: 150, height: 60, resizeMode: 'contain', marginLeft: 10 }} />
             </View>
          </View>

          {/* Description */}
          <Text className="text-center text-muted-foreground text-base mb-8">
            {t('auth.description')}
          </Text>

          {/* Email Input */}
          <View className="mb-8 " >
            <Input
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              
            />
          </View>

        

          {/* Error Message */}
          {error ? (
            <Text className="text-red-500 text-sm mb-4 text-center">{error}</Text>
          ) : null}

          {/* Main Button */}
          
           {GetButtonDialog(dialogOpen, setDialogOpen, colorScheme, signInWithOTP,
             loading, email, verifyOTP, token, setToken, otpCountdown, handleResendOTP, {
               connecting: t('auth.connecting'),
               signUpOrLogin: t('auth.signUpOrLogin'),
               otpTitle: t('auth.otpTitle'),
               otpDescription: t('auth.otpDescription'),
               otpTimeRemaining: t('auth.otpTimeRemaining'),
               otpPlaceholder: t('auth.otpPlaceholder'),
               resendEmail: t('auth.resendEmail'),
               verify: t('auth.verify'),
               otpRequired: t('auth.otpRequired'),
               error: t('common.error'),
             })}

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-500 dark:bg-gray-600 " />
            <Text className="mx-3 text-sm  text-gray-900 dark:text-white">{t('auth.or')}</Text>
            <View className="flex-1 h-px bg-gray-500 dark:bg-gray-600 " />
          </View>

         {/* Google Button */}
          <View className="mb-4 items-center">
            {googleSigninModule ? (
              <googleSigninModule.GoogleSigninButton
                size={googleSigninModule.GoogleSigninButton.Size.Wide}
                color={isDark ? googleSigninModule.GoogleSigninButton.Color.Dark : googleSigninModule.GoogleSigninButton.Color.Light}
                onPress={handleGoogleLogin}
                disabled={loading}
                style={{ width: '100%', height: 48 }}
              />
            ) : (
              <Button
                className="h-12 rounded-lg w-full flex-row items-center justify-center bg-gray-100 dark:bg-neutral-800"
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <FontAwesome name="google" size={24} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
                <Text className="ml-3 font-semibold text-base text-gray-900 dark:text-white">{t('auth.googleContinue')}</Text>
              </Button>
            )}
          </View>
          {/* Apple Button */}
          <Button className=" h-12 rounded-lg mb-8 flex-row items-center justify-center bg-gray-100 dark:bg-neutral-800"
          onPress={toggleColorScheme}>
            <FontAwesome name="apple" size={24} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
            <Text className="ml-3 font-semibold text-base  text-gray-900 dark:text-white">{t('auth.appleContinue')}</Text>
          </Button>
        </View>

        {/* Footer */}
        <View>
          {/* Terms Text */}
          <Text className="text-gray-600 dark:text-gray-400 text-xs leading-5 mb-6">
            {t('auth.legalPrefix')}{' '}
            <Text className="text-orange-500 text-xs leading-5 mb-6 ">{t('auth.legalTerms')}</Text>
            {' '}{t('auth.legalMiddle')}{' '}
            <Text className="text-orange-500 text-xs leading-5 mb-6">{t('auth.legalPrivacy')}</Text>
            {t('auth.legalSuffix')}
          </Text>

          {/* Support Text */}
          <Text className="text-gray-600 dark:text-gray-400 text-xs">
            {t('auth.needHelp')}{' '}
            <Text className="text-orange-500 text-xs" onPress={handleContactSupport}>{t('auth.contactSupport')}</Text>
          </Text>

        </View>
      </View>
    </ScrollView>
    <Snackbar
      visible={snackbarVisible}
      onDismiss={() => setSnackbarVisible(false)}
      duration={3500}
      action={{
        label: t('common.close'),
        onPress: () => setSnackbarVisible(false),
      }}
    >
      {snackbarMessage}
    </Snackbar>
    </SafeAreaView>
 
  );
}

function GetButtonDialog(dialogOpen: boolean, setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>, colorScheme: "light" | "dark" | undefined , signInWithOTP: () => void,
loading?: boolean, email?: string, verifyOTP?: (token: string) => void, token?: string, setToken?: React.Dispatch<React.SetStateAction<string>>, otpCountdown?: number, handleResendOTP?: () => void, labels?: {
  connecting: string;
  signUpOrLogin: string;
  otpTitle: string;
  otpDescription: string;
  otpTimeRemaining: string;
  otpPlaceholder: string;
  resendEmail: string;
  verify: string;
  otpRequired: string;
  error: string;
}) {
  const minutes = Math.floor((otpCountdown ?? 0) / 60);
  const seconds = (otpCountdown ?? 0) % 60;
  const formattedCountdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const resolvedLabels = {
    connecting: labels?.connecting ?? '',
    signUpOrLogin: labels?.signUpOrLogin ?? '',
    otpTitle: labels?.otpTitle ?? '',
    otpDescription: labels?.otpDescription ?? '',
    otpTimeRemaining: labels?.otpTimeRemaining ?? '',
    otpPlaceholder: labels?.otpPlaceholder ?? '',
    resendEmail: labels?.resendEmail ?? '',
    verify: labels?.verify ?? '',
    otpRequired: labels?.otpRequired ?? '',
    error: labels?.error ?? '',
  };
  

  
  return (
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                {/* button de l'action  */}
              <Button onPress={signInWithOTP}
            disabled={loading || !email }
            className="bg-orange-500 h-12 rounded-lg mb-6"
              >
                <Text className="text-white font-bold text-base">
                  {loading ? resolvedLabels.connecting : resolvedLabels.signUpOrLogin}
                </Text>
              </Button>
            

            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{resolvedLabels.otpTitle}</DialogTitle>
                <DialogDescription>
                  {resolvedLabels.otpDescription}
                </DialogDescription>
                <Text className="text-center text-sm font-medium text-orange-500">
                  {resolvedLabels.otpTimeRemaining} : {formattedCountdown}
                </Text>
              </DialogHeader>
              {/* Contenu du dialog ici */}
               <View className="mb-4 mt-4 " >
                <Input
                  placeholder={resolvedLabels.otpPlaceholder}
                keyboardType="number-pad"
                onChangeText={setToken}
                textAlign='center'
                />
                </View>
              {/* Button de fermeture du dialog */}
                <DialogFooter>
                  <View className="flex-row items-center justify-center">

                   {otpCountdown === 0 ? (
                    <Button
                      className="mr-3 h-12 rounded-lg bg-gray-200 dark:bg-neutral-800"
                      disabled={loading}
                      onPress={handleResendOTP}
                    >
                      <Text className="font-bold text-base text-gray-900 dark:text-white">
                        {resolvedLabels.resendEmail}
                      </Text>
                    </Button>
                   ) : null}

                   {/* Button Valider */}
                    <Button className="bg-orange-500 h-12 rounded-lg flex-1 flex-row items-center justify-center "
                     onPress={() => {
                        Keyboard.dismiss();
                        if (token) {
                          verifyOTP && verifyOTP(token);
                        }else {Alert.alert(resolvedLabels.error, resolvedLabels.otpRequired)
                        }
                      }}
                    >
                      <Text className="text-white font-bold text-base">
                        {resolvedLabels.verify}
                      </Text>
                    </Button>
                   
                
                
                </View>
                </DialogFooter>
            </DialogContent>
          </Dialog>

  );
}
