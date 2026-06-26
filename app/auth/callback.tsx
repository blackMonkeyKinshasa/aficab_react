import { useEffect } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import * as ExpoLinking from 'expo-linking';
import { useRouter } from 'expo-router';
import type { EmailOtpType } from '@supabase/supabase-js';

import { color } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type AuthCallbackParams = {
  access_token?: string;
  refresh_token?: string;
  code?: string;
  error?: string;
  error_code?: string;
  token_hash?: string;
  type?: string;
};

function getAuthCallbackParams(url: string): AuthCallbackParams {
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

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function finishAuthFromUrl(url: string | null) {
      if (!url) {
        router.replace('/login');
        return;
      }

      const params = getAuthCallbackParams(url);

      if (params.error || params.error_code) {
        router.replace('/login');
        return;
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);

        router.replace(error ? '/login' : '/');
        return;
      }

      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        router.replace(error ? '/login' : '/');
        return;
      }

      if (params.token_hash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: (params.type ?? 'email') as EmailOtpType,
        });

        router.replace(error ? '/login' : '/');
        return;
      }

      router.replace('/login');
    }

    Linking.getInitialURL()
      .then((url) => {
        if (isMounted) {
          void finishAuthFromUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          router.replace('/login');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={color.primary} />
    </View>
  );
}
