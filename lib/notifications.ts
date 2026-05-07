import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { updateUserByID } from '@/api/user';
import { User } from '@/constants/dataInterface';

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

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  const notifications = ensureNotificationsReady();

  if (!notifications) {
    console.log('Les notifications push distantes ne sont pas prises en charge dans Expo Go.');
    return null;
  }

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: notifications.AndroidImportance.MAX,
    });
  }

  if (!Device.isDevice) {
    console.log('Les notifications push necessitent un appareil physique.');
    return null;
  }

  const { status: existingStatus } = await notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error('EAS projectId manquant pour enregistrer le token push.');
  }

  const { data } = await notifications.getExpoPushTokenAsync({ projectId });

  return data;
}

export async function getLastNotificationResponseAsync(): Promise<NotificationResponseLike | null> {
  const notifications = ensureNotificationsReady();

  if (!notifications) {
    return null;
  }

  const response = await notifications.getLastNotificationResponseAsync();
  return response as NotificationResponseLike | null;
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
  const updates: Pick<User, 'deviceToken'> = {
    deviceToken,
  };

  return updateUserByID(userId, updates);
}