declare module 'expo-router';
declare module '@react-navigation/elements';
declare module 'expo-contacts';
declare module '@react-navigation/native-stack' {
  export type NativeStackNavigationOptions = Record<string, unknown>;
}

declare module 'posthog-react-native' {
  import type * as React from 'react';

  export interface PostHogOptions {
    host?: string;
    disabled?: boolean;
  }

  export class PostHog {
    constructor(apiKey: string, options?: PostHogOptions);
    capture(event: string, properties?: Record<string, unknown>): Promise<void>;
    identify(distinctId?: string, properties?: Record<string, unknown>): void;
    reset(): void;
  }

  export const PostHogProvider: React.ComponentType<{
    children: React.ReactNode;
    client?: PostHog;
    apiKey?: string;
    options?: PostHogOptions;
  }>;

  export function usePostHog(): PostHog;
}
