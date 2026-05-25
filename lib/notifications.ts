import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { updateDeviceToken } from '@/api/user';

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

  if (typeof route === 'string' && route.trim()) {
    return route;
  }

  if (typeof data.bookingId === 'string' && data.bookingId.trim()) {
    return '/(tabs)/reservation';
  }

  return '/notificationsPage';
}

export async function registerForPushNotificationsAsync(): Promise<PushTokenRegistrationResult> {
  const trace = ['debut du flux expo token'];

  if (Platform.OS === 'web') {
    trace.push('blocage: plateforme web');
    return {
      token: null,
      errorMessage: 'Les notifications push ne sont pas disponibles sur le web.',
      stage: 'web',
      trace,
    };
  }

  trace.push('verification du module expo-notifications');
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    console.log('Les notifications push distantes ne sont pas prises en charge dans Expo Go.');
    trace.push('blocage: module indisponible ou expo go');
    return {
      token: null,
      errorMessage: 'Les notifications push distantes ne sont pas prises en charge dans Expo Go.',
      stage: 'notifications-module-unavailable',
      trace,
    };
  }

  if (Platform.OS === 'android') {
  trace.push('configuration du canal android');

  await notifications.setNotificationChannelAsync('default', {
    name: 'Aficab Notifications',
    importance: notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility:
      notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

  trace.push('verification appareil physique');
  if (!Device.isDevice) {
    console.log('Les notifications push necessitent un appareil physique.');
    trace.push('blocage: appareil non physique');
    return {
      token: null,
      errorMessage: 'Les notifications push necessitent un appareil physique.',
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
    return {
      token: null,
      errorMessage: 'La permission des notifications a ete refusee.',
      stage: 'permission-denied',
      trace,
    };
  }

  trace.push('lecture du projectId eas');
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    trace.push('blocage: projectId eas manquant');
    return {
      token: null,
      errorMessage: 'EAS projectId manquant pour enregistrer le token push.',
      stage: 'missing-project-id',
      trace,
    };
  }

  trace.push('generation du token expo');
  const { data } = await notifications.getExpoPushTokenAsync({ projectId });
  trace.push('token expo genere avec succes');

  return {
    token: data,
    errorMessage: null,
    stage: 'success',
    trace,
  };
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
  return updateDeviceToken(userId, deviceToken);
}