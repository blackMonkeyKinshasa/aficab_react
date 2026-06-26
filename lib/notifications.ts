import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

import { updateDeviceToken } from '@/api/user';
import { resolveAppHref } from '@/lib/deep-linking';
import { translateCurrent } from '@/lib/i18n';

type NotificationsModule = typeof import('expo-notifications');

export type NotificationSubscription = {
  remove: () => void;
};

export type NotificationLike = {
  request: {
    identifier?: string;
    content: {
      data: Record<string, unknown>;
    };
  };
};

export type NotificationResponseLike = {
  notification: NotificationLike;
};

export type PushTokenRegistrationResult = {
  token: string | null;
  errorMessage: string | null;
  stage: string;
  trace: string[];
};

let notificationsHandlerConfigured = false;

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

function getNotificationsModule(): NotificationsModule | null {
  if (Platform.OS === 'web' || isExpoGo()) {
    return null;
  }

  return require('expo-notifications') as NotificationsModule;
}

export function reportPushTokenStage(stage: string, extra?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: 'push_token',
    message: stage,
    data: extra,
    level: stage.includes('error') || stage.includes('denied') ? 'warning' : 'info',
  });
}

export function ensureNotificationsReady() {
  const notifications = getNotificationsModule();

  if (!notifications || notificationsHandlerConfigured) {
    return notifications;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationsHandlerConfigured = true;
  return notifications;
}

type NotificationData = {
  route?: string;
  screen?: string;
  link?: string;
  url?: string;
  pathname?: string;
  bookingId?: string;
};

export function getNotificationTargetRoute(notification: NotificationLike) {
  const data = notification.request.content.data as NotificationData;
  const route = data.route ?? data.screen ?? data.link ?? data.url ?? data.pathname;
  const bookingId = typeof data.bookingId === 'string' ? data.bookingId.trim() : '';

  if (bookingId) {
    const encodedBookingId = encodeURIComponent(bookingId);
    return `/(tabs)/reservation?highlightBookingId=${encodedBookingId}&openBookingId=${encodedBookingId}`;
  }

  if (typeof route === 'string' && route.trim()) {
    return resolveAppHref(route) ?? route;
  }

  return '/notificationsPage';
}

export async function registerForPushNotificationsAsync(): Promise<PushTokenRegistrationResult> {
  const trace = ['debut du flux expo token'];

  if (Platform.OS === 'web') {
    trace.push('blocage: plateforme web');
    reportPushTokenStage('web', { platform: Platform.OS });
    return {
      token: null,
      errorMessage: translateCurrent('notifications.push.webUnavailable'),
      stage: 'web',
      trace,
    };
  }

  trace.push('verification du module expo-notifications');
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    trace.push('blocage: module indisponible ou expo go');
    reportPushTokenStage('notifications-module-unavailable', { platform: Platform.OS });
    return {
      token: null,
      errorMessage: translateCurrent('notifications.push.expoGoUnavailable'),
      stage: 'notifications-module-unavailable',
      trace,
    };
  }

  if (Platform.OS === 'android') {
  trace.push('configuration du canal android');

  await notifications.setNotificationChannelAsync('default', {
    name: translateCurrent('notifications.push.channelName'),
    importance: notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility:
      notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

  trace.push('verification appareil physique');
  if (!Device.isDevice) {
    trace.push('blocage: appareil non physique');
    reportPushTokenStage('not-physical-device', { platform: Platform.OS });
    return {
      token: null,
      errorMessage: translateCurrent('notifications.push.physicalDeviceRequired'),
      stage: 'not-physical-device',
      trace,
    };
  }

  trace.push('verification permission notifications');
  const { status: existingStatus } = await notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    trace.push(`permission actuelle: ${existingStatus}`);
    const { status } = await notifications.requestPermissionsAsync();
    finalStatus = status;
    trace.push(`permission apres demande: ${finalStatus}`);
  } else {
    trace.push('permission deja accordee');
  }

  if (finalStatus !== 'granted') {
    trace.push('blocage: permission refusee');
    reportPushTokenStage('permission-denied', {
      platform: Platform.OS,
      existingStatus,
      finalStatus,
    });
    return {
      token: null,
      errorMessage: translateCurrent('notifications.push.permissionDenied'),
      stage: 'permission-denied',
      trace,
    };
  }

  trace.push('lecture du projectId eas');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    trace.push('blocage: projectId eas manquant');
    reportPushTokenStage('missing-project-id', { platform: Platform.OS });
    return {
      token: null,
      errorMessage: translateCurrent('notifications.push.projectIdMissing'),
      stage: 'missing-project-id',
      trace,
    };
  }

  trace.push('generation du token expo');
  try {
    const { data } = await notifications.getExpoPushTokenAsync({ projectId });
    trace.push('token expo genere avec succes');
    reportPushTokenStage('success', { platform: Platform.OS });

    return {
      token: data,
      errorMessage: null,
      stage: 'success',
      trace,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : translateCurrent('notifications.push.unknownTokenError');

    trace.push(`erreur fcm: ${errorMessage}`);
    reportPushTokenStage('fcm-token-error', {
      platform: Platform.OS,
      errorMessage,
    });
    Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
      tags: { push_token_stage: 'fcm-token-error', platform: Platform.OS },
    });

    return {
      token: null,
      errorMessage,
      stage: 'fcm-token-error',
      trace,
    };
  }
}

export async function syncPushTokenOnAppActive(): Promise<PushTokenRegistrationResult> {
  return registerForPushNotificationsAsync();
}

export function subscribeToPushTokenChanges(
  listener: (token: string) => void
): NotificationSubscription | null {
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    return null;
  }

  return notifications.addPushTokenListener(({ data }) => {
    if (typeof data === 'string' && data.trim()) {
      listener(data);
    }
  });
}

export async function getLastNotificationResponseAsync(): Promise<NotificationResponseLike | null> {
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    return null;
  }

  const response = await notifications.getLastNotificationResponseAsync();
  return response as NotificationResponseLike | null;
}

export async function clearNotificationBadgeAsync() {
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    return false;
  }

  await notifications.setBadgeCountAsync(0);
  return true;
}

export function addNotificationReceivedListener(
  listener: (notification: NotificationLike) => void
): NotificationSubscription | null {
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    return null;
  }

  return notifications.addNotificationReceivedListener((notification) => {
    listener(notification as NotificationLike);
  });
}

export function addNotificationResponseReceivedListener(
  listener: (response: NotificationResponseLike) => void
): NotificationSubscription | null {
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    return null;
  }

  return notifications.addNotificationResponseReceivedListener((response) => {
    listener(response as NotificationResponseLike);
  });
}

export async function persistUserDeviceToken(userId: string, deviceToken: string) {
  const result = await updateDeviceToken(userId, deviceToken);

  if (result && typeof result === 'object' && 'deviceToken' in result) {
    const returnedToken = String(result.deviceToken ?? '');

    if (!returnedToken) {
      Sentry.captureMessage('device_token_patch_missing_in_response', {
        level: 'warning',
        extra: { userId },
      });
    }
  } else {
    Sentry.captureMessage('device_token_patch_unexpected_response', {
      level: 'warning',
      extra: { userId },
    });
  }

  return result;
}
