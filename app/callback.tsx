import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import type { EmailOtpType } from '@supabase/supabase-js';
import * as ExpoLinking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { color } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type AuthCallbackParams = {
  access_token?: string;
  refresh_token?: string;
  code?: string;
  error?: string;
  error_code?: string;
  token?: string;
  token_hash?: string;
  type?: string;
};

type RouteAuthCallbackParams = Record<string, string | string[] | undefined>;

function getFirstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthCallbackParamsFromRoute(params: RouteAuthCallbackParams): AuthCallbackParams {
  return {
    access_token: getFirstParamValue(params.access_token),
    refresh_token: getFirstParamValue(params.refresh_token),
    code: getFirstParamValue(params.code),
    error: getFirstParamValue(params.error),
    error_code: getFirstParamValue(params.error_code),
    token: getFirstParamValue(params.token),
    token_hash: getFirstParamValue(params.token_hash),
    type: getFirstParamValue(params.type),
  };
}

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

function hasAuthCallbackParams(params: AuthCallbackParams) {
  return Boolean(
    params.access_token ||
    params.refresh_token ||
    params.code ||
    params.error ||
    params.error_code ||
    params.token ||
    params.token_hash
  );
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<RouteAuthCallbackParams>();
  const routeAuthParams = useMemo(() => getAuthCallbackParamsFromRoute(routeParams), [routeParams]);

  useEffect(() => {
    let isMounted = true;

    async function finishAuthFromParams(params: AuthCallbackParams) {
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

      const tokenHash = params.token_hash ?? params.token;

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (params.type ?? 'magiclink') as EmailOtpType,
        });

        router.replace(error ? '/login' : '/');
        return;
      }

      router.replace('/login');
    }

    function finishAuthFromUrl(url: string | null) {
      if (!url) {
        router.replace('/login');
        return;
      }

      return finishAuthFromParams(getAuthCallbackParams(url));
    }

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isMounted) {
        void finishAuthFromUrl(url);
      }
    });

    if (hasAuthCallbackParams(routeAuthParams)) {
      void finishAuthFromParams(routeAuthParams);
    } else {
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
    }

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [routeAuthParams, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={color.primary} />
    </View>
  );
}
