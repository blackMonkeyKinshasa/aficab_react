import { useEffect, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import type { ComponentProps } from 'react';

import { readNotification } from '@/api/activity';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { NotificationCard } from '@/components/my-ui/NotificationCard';
import type { NotificationDetailLine } from '@/components/my-ui/NotificationCard';
import { NotificationDayHeader } from '@/components/my-ui/NotificationDayHeader';
import { NotificationFeedHeader } from '@/components/my-ui/NotificationFeedHeader';
import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import { color } from '@/constants/colors';
import { Activity, ActivityAction } from '@/constants/dataInterface';
import { useReadNotification } from '@/hooks/mutations/useReadNotification';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { TranslationKey, useI18n } from '@/lib/i18n';
import { POLLING } from '@/lib/query/polling';
import { queryKeys } from '@/lib/query/query-keys';
import { clearNotificationBadgeAsync } from '@/lib/notifications';
import { useLayoutScale } from '@/lib/layout-scale';
import { useMyStateNotif } from '@/store/notification-state';
import { useMyStateUser } from '@/store/user-state';

const EMPTY_ACTIVITIES: Activity[] = [];
type IoniconName = ComponentProps<typeof Ionicons>['name'];

function formatDate(iso: string, locale: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'pre-fix',hypothesisId:'H2',location:'notificationsPage.tsx:formatDate',message:'formatDate threw',data:{iso,locale,error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

function formatClock(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDaySectionTitle(iso: string, locale: string) {
  const source = new Date(iso);
  const today = new Date();
  const sourceDay = new Date(source.getFullYear(), source.getMonth(), source.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((todayDay - sourceDay) / 86400000);

  if (diffDays === 0) {
    return locale.startsWith('fr') ? "Aujourd'hui" : 'Today';
  }

  if (diffDays === 1) {
    return locale.startsWith('fr') ? 'Hier' : 'Yesterday';
  }

  return source.toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatRelativeDate(iso: string, locale: string) {
  const date = new Date(iso).getTime();
  const diffMs = date - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const isFrench = locale.startsWith('fr');

  const formatUnit = (value: number, unit: 'minute' | 'hour' | 'day') => {
    if (isFrench) {
      if (unit === 'minute') {
        if (value === 0) return 'maintenant';
        if (value === -1) return 'il y a 1 minute';
        if (value === 1) return 'dans 1 minute';
        return value < 0 ? `il y a ${Math.abs(value)} minutes` : `dans ${value} minutes`;
      }

      if (unit === 'hour') {
        if (value === -1) return 'il y a 1 heure';
        if (value === 1) return 'dans 1 heure';
        return value < 0 ? `il y a ${Math.abs(value)} heures` : `dans ${value} heures`;
      }

      if (value === 0) return "aujourd'hui";
      if (value === -1) return 'hier';
      if (value === 1) return 'demain';
      return value < 0 ? `il y a ${Math.abs(value)} jours` : `dans ${value} jours`;
    }

    if (unit === 'minute') {
      if (value === 0) return 'now';
      if (value === -1) return '1 minute ago';
      if (value === 1) return 'in 1 minute';
      return value < 0 ? `${Math.abs(value)} minutes ago` : `in ${value} minutes`;
    }

    if (unit === 'hour') {
      if (value === -1) return '1 hour ago';
      if (value === 1) return 'in 1 hour';
      return value < 0 ? `${Math.abs(value)} hours ago` : `in ${value} hours`;
    }

    if (value === 0) return 'today';
    if (value === -1) return 'yesterday';
    if (value === 1) return 'tomorrow';
    return value < 0 ? `${Math.abs(value)} days ago` : `in ${value} days`;
  };

  if (Math.abs(diffMinutes) < 60) {
    return formatUnit(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatUnit(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatUnit(diffDays, 'day');
}

function getBookingTiming(activity: Activity, locale: string) {
  const departureAt = activity.booking?.departureAt;
  if (!departureAt) {
    return '';
  }

  return new Date(departureAt).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBookingPreview(activity: Activity, locale: string) {
  if (!activity.booking) {
    return null;
  }

  try {
    const booking = activity.booking;
    const pickup = booking.departure?.label ?? '';
    const destination = booking.arrival?.label ?? '';

    return {
      vehicle: activity.car?.name ?? activity.target ?? activity.bookingId ?? '—',
      departureTime: booking.departureAt
        ? new Date(booking.departureAt).toLocaleTimeString(locale, {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
      pickup,
      destination,
      serviceType: booking.type,
      arrivalTime: booking.arrivalAt
        ? new Date(booking.arrivalAt).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
      route: [pickup, destination].filter(Boolean).join(' → ') || '—',
    };
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'pre-fix',hypothesisId:'H3',location:'notificationsPage.tsx:getBookingPreview',message:'getBookingPreview threw',data:{id:activity?.id,departureAt:activity?.booking?.departureAt,locale,error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

function getActionMeta(
  action: ActivityAction,
  activity: Activity,
  t: ReturnType<typeof useI18n>['t'],
  tf: ReturnType<typeof useI18n>['tf'],
  appLocale: string
): { title: string; body: string; iconName: IoniconName; subtitle: string; tone: string } {
  const bookingLabel = activity.booking?.car?.name ?? activity.target ?? activity.bookingId ?? '';
  const driverName =
    activity.driver?.user?.full_name ??
    activity.booking?.driver?.user?.full_name ??
    activity.target ??
    '';
  const carName = activity.booking?.car?.name ?? '';
  const carPlate = activity.booking?.car?.registrationId ?? '';
  const schedule = getBookingTiming(activity, appLocale);

  switch (action) {
    case 'car-approved':
      return {
        title: t('notifications.action.carApproved.title'),
        body: tf('notifications.action.carApproved.message', { target: activity.target ?? '' }),
        iconName: 'checkmark-circle',
        subtitle: t('notifications.action.carApproved.title'),
        tone: '#16a34a',
      };
    case 'car-pending-approval':
      return {
        title: t('notifications.action.carPending.title'),
        body: tf('notifications.action.carPending.message', { target: activity.target ?? '' }),
        iconName: 'time-outline',
        subtitle: t('notifications.action.carPending.title'),
        tone: '#f59e0b',
      };
    case 'driver-approved':
      return {
        title: t('notifications.action.driverApproved.title'),
        body: tf('notifications.action.driverApproved.message', { target: activity.target ?? '' }),
        iconName: 'checkmark-circle',
        subtitle: t('notifications.action.driverApproved.title'),
        tone: '#16a34a',
      };
    case 'driver-pending-approval':
      return {
        title: t('notifications.action.driverPending.title'),
        body: tf('notifications.action.driverPending.message', { target: activity.target ?? '' }),
        iconName: 'time-outline',
        subtitle: t('notifications.action.driverPending.title'),
        tone: '#f59e0b',
      };
    case 'booking-new':
      return {
        title: 'Réservation confirmée',
        body:
          activity.booking?.type === 'TA'
            ? 'Votre transfert vers l’aéroport est confirmé.'
            : 'Votre réservation pour une location à la journée est confirmée.',
        iconName: 'checkmark',
        subtitle: activity.booking?.type === 'TA' ? t('booking.airportService') : t('booking.dailyService'),
        tone: '#2563eb',
      };
    case 'booking-checkin':
    case 'booking-checkout':
      return {
        title: 'Votre chauffeur est en route',
        body: driverName
          ? `${driverName} se dirige vers votre point de prise en charge.`
          : 'Votre chauffeur se dirige vers votre point de prise en charge.',
        iconName: 'car-outline',
        subtitle: driverName ? `Chauffeur : ${driverName}` : t('notifications.title'),
        tone: '#7c3aed',
      };
    case 'booking-driver-notify':
      return {
        title: 'Chauffeur notifie',
        body: activity.bookingId
          ? `Le chauffeur a ete notifie pour la reservation ${activity.bookingId}.`
          : 'Le chauffeur a ete notifie pour votre reservation.',
        iconName: 'notifications-outline',
        subtitle: t('notifications.action.bookingDriverNotify.title'),
        tone: '#ea580c',
      };
    case 'booking-driver-cancel':
      return {
        title: 'Réservation annulée',
        body: driverName
          ? `La course de ${driverName}${activity.bookingId ? ` (${activity.bookingId})` : ''} a été annulée.`
          : `Votre réservation${activity.bookingId ? ` ${activity.bookingId}` : ''} a été annulée.`,
        iconName: 'close-circle-outline',
        subtitle: 'Annulation',
        tone: '#dc2626',
      };
    case 'booking-client-cancel':
      return {
        title: 'Réservation annulée',
        body: `Votre réservation${activity.bookingId ? ` ${activity.bookingId}` : ''} a été annulée.`,
        iconName: 'close-circle-outline',
        subtitle: 'Annulation',
        tone: '#dc2626',
      };
    case 'booking-auto-canceled':
      return {
        title: 'Réservation annulée',
        body: `Votre réservation${activity.bookingId ? ` ${activity.bookingId}` : ''} a été annulée automatiquement par le système.`,
        iconName: 'close-circle-outline',
        subtitle: 'Annulation automatique',
        tone: '#dc2626',
      };
    default:
      return {
        title: 'Nouvelle activite',
        body: activity.target ?? '',
        iconName: 'notifications-outline',
        subtitle: t('notifications.title'),
        tone: '#6b7280',
      };
  }
}

export default function Notifications() {
  // #region agent log
  fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'pre-fix',hypothesisId:'H4',location:'notificationsPage.tsx:Notifications',message:'notifications screen mount',data:{},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t, tf, appLocale } = useI18n();
  const { font } = useLayoutScale();
  const router = useRouter();
  const notificationsTitle = t('notifications.title');
  const emptyTitleKeyNotifiction: TranslationKey = 'notifications.empty.title';
  const emptyDescriptionKeyNotifiction: TranslationKey = 'notifications.empty.description';

  const [error, setError] = useState<string | null>(null);
  const storedUser = useMyStateUser((state) => state.user);
  const queryClient = useQueryClient();
  const userId = storedUser?.id;
  const clearCountNotif = useMyStateNotif((state) => state.clearCountNotif);
  const decrementCountNotif = useMyStateNotif((state) => state.decrementCountNotif);
  const setCountNotif = useMyStateNotif((state) => state.setCountNotif);
  const readNotificationMutation = useReadNotification();
  const {
    data,
    isLoading: loading,
    isLoadingError,
  } = useNotifications(storedUser?.id, { pollingInterval: POLLING.notifications });
  const activities = data ?? EMPTY_ACTIVITIES;
  const unreadCount = activities.filter((activity) => !activity.isRead).length;
  // #region agent log
  fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'pre-fix',hypothesisId:'H1',location:'notificationsPage.tsx:afterQuery',message:'notifications query in screen',data:{loading,isLoadingError,hasUser:Boolean(storedUser?.id),dataType:typeof data,isArray:Array.isArray(data),length:Array.isArray(data)?data.length:null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const navigation = useNavigation();
  const isMarkingAsReadRef = useRef(false);

  useEffect(() => {
    clearNotificationBadgeAsync().catch(() => {
      // Le reset du badge reste silencieux si la plateforme ne le prend pas en charge.
    });
  }, []);

  useEffect(() => {
    const nextCount = activities.filter((activity) => !activity.isRead).length;
    // #region agent log
    fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'notifications-count-post-fix',hypothesisId:'H7',location:'notificationsPage.tsx:countEffect',message:'Synchronizing unread notification count',data:{currentCount:useMyStateNotif.getState().countNotif,nextCount,activityCount:activities.length,hasQueryData:Boolean(data)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setCountNotif(nextCount);
  }, [activities, setCountNotif]);

  useEffect(() => {
    if (isLoadingError) {
      setError(t('notifications.loadError'));
      return;
    }

    setError(null);
  }, [isLoadingError, t]);

  const sections = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'pre-fix',hypothesisId:'H2',location:'notificationsPage.tsx:sections',message:'building notification sections',data:{isArray:Array.isArray(activities),length:Array.isArray(activities)?activities.length:null,createAts:Array.isArray(activities)?activities.slice(0,5).map((item)=>item?.createAt):null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const ordered = [...activities].sort((left, right) => {
      return new Date(right.createAt).getTime() - new Date(left.createAt).getTime();
    });

    const groups = ordered.reduce<{ title: string; key: string; data: Activity[] }[]>(
      (accumulator, activity) => {
        const key = getDayKey(activity.createAt);
        const existingGroup = accumulator.find((group) => group.key === key);

        if (existingGroup) {
          existingGroup.data.push(activity);
          return accumulator;
        }

        accumulator.push({
          key,
          title: formatDaySectionTitle(activity.createAt, appLocale),
          data: [activity],
        });

        return accumulator;
      },
      []
    );

    return groups;
  }, [activities, appLocale]);

  const patchActivities = (updater: (currentActivities: Activity[]) => Activity[]) => {
    if (!userId) {
      return;
    }

    queryClient.setQueryData(queryKeys.activity.list(userId), (currentActivities: Activity[] | undefined) =>
      updater(currentActivities ?? [])
    );
  };

  usePreventRemove(
    activities.some((activity) => !activity.isRead),
    ({ data }) => {
      const unreadNotifications = activities.filter((activity) => !activity.isRead);

      if (unreadNotifications.length === 0 || isMarkingAsReadRef.current) {
        return;
      }

      isMarkingAsReadRef.current = true;

      Promise.allSettled(unreadNotifications.map((activity) => readNotification(activity.id)))
        .then(() => {
          patchActivities((currentActivities) =>
            currentActivities.map((activity) =>
              activity.isRead ? activity : { ...activity, isRead: true }
            )
          );
          void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
          clearCountNotif();
          requestAnimationFrame(() => {
            navigation.dispatch(data.action);
          });
        })
        .finally(() => {
          isMarkingAsReadRef.current = false;
        });
    }
  );
  // #region agent log
  fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'notifications-crash-v1',hypothesisId:'H4',location:'notificationsPage.tsx:afterUsePreventRemove',message:'usePreventRemove completed',data:{hasUnread:activities.some((activity)=>!activity.isRead),activityCount:activities.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const handleNotificationPress = (selectedActivity: Activity) => {
    let shouldCallApi = false;

    patchActivities((currentActivities) =>
      currentActivities.map((activityItem) => {
        if (activityItem.id !== selectedActivity.id || activityItem.isRead) {
          return activityItem;
        }

        shouldCallApi = true;
        return { ...activityItem, isRead: true };
      })
    );

    const openRelatedBooking = () => {
      if (!selectedActivity.bookingId) {
        return;
      }

      router.push({
        pathname: '/(tabs)/reservation',
        params: {
          highlightBookingId: selectedActivity.bookingId,
          //  openBookingId: selectedActivity.bookingId, /*pour ouvrir les detail*/
        },
      });
    };

    if (!shouldCallApi) {
      openRelatedBooking();
      return;
    }

    decrementCountNotif();

    readNotificationMutation
      .mutateAsync(selectedActivity.id)
      .then(openRelatedBooking)
      .catch(() => {
        patchActivities((currentActivities) =>
          currentActivities.map((activityItem) =>
            activityItem.id === selectedActivity.id
              ? { ...activityItem, isRead: false }
              : activityItem
          )
        );
        setCountNotif(activities.filter((activity) => !activity.isRead).length);
      });
  };

  const handleMarkAllAsRead = () => {
    const unreadActivities = activities.filter((activity) => !activity.isRead);
    if (unreadActivities.length === 0) {
      return;
    }

    patchActivities((currentActivities) =>
      currentActivities.map((activity) =>
        activity.isRead ? activity : { ...activity, isRead: true }
      )
    );
    clearCountNotif();

    Promise.allSettled(unreadActivities.map((activity) => readNotification(activity.id))).finally(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    });
  };

  return (
    <>
      <Stack.Screen
          options={buildStackScreenOptions({
            title: notificationsTitle,
            isDark,
            canGoBack: true,
          })}
      />
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? color.appDarkBackground : '#ffffff' },
        ]}>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#555', fontSize: font.sm }]}>{error}</Text>
        ) : (
          <View style={{ flex: 1, width: '100%' }}>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section }) => (
                <NotificationDayHeader title={section.title} isDark={isDark} />
              )}
              renderItem={({ item }) => {
                const meta = getActionMeta(item.action, item, t, tf, appLocale);
                const bookingPreview = getBookingPreview(item, appLocale);
                const routeFields = bookingPreview
                  ? [
                      ...(bookingPreview.pickup
                        ? [{ label: t('booking.pickupLocation'), value: bookingPreview.pickup }]
                        : []),
                      ...(bookingPreview.destination
                        ? [{ label: t('booking.destination'), value: bookingPreview.destination }]
                        : []),
                    ]
                  : [];
                const detailLines: NotificationDetailLine[] = [
                  {
                    label: 'Service',
                    value:
                      bookingPreview?.serviceType === 'TA'
                        ? `${t('booking.airportService')}`
                        : `${t('booking.dailyService')}`,
                  },
                  ...(item.booking?.driver?.user?.full_name
                    ? [{ label: 'Chauffeur', value: `${item.booking.driver.user.full_name}` }]
                    : []),
                  ...(bookingPreview?.vehicle && bookingPreview.vehicle !== '—'
                    ? [{ label: `${t('reservations.field.vehicle')}`, value: `${bookingPreview.vehicle}` }]
                    : []),
                  ...(item.action === 'booking-checkin' || item.action === 'booking-checkout'
                    ? [{ label: 'Arrivée', value: 'Heure d’arrivée à confirmer' }]
                    : []),
                  ...(item.action === 'booking-auto-canceled'
                    ? [
                        {
                          label: 'Motif',
                          value: item.bookingId
                            ? `Votre réservation ${item.bookingId} a été annulée car le paiement n’a pas été reçu dans le délai prévu.`
                            : 'Votre réservation a été annulée car le paiement n’a pas été reçu dans le délai prévu.',
                        },
                      ]
                    : []),
                ];

                return (
                  <NotificationCard
                    isDark={isDark}
                    isUnread={!item.isRead}
                    title={meta.title}
                    subtitle={`${formatClock(item.createAt, appLocale)} · ${meta.subtitle}`}
                    message={meta.body}
                    dateLabel={bookingPreview?.departureTime || formatRelativeDate(item.createAt, appLocale)}
                    icon={meta.iconName}
                    tone={meta.tone}
                    routeFields={routeFields}
                    detailLines={detailLines}
                    actionLabel={t('notifications.openBooking')}
                    onOpenBooking={item.bookingId ? () => handleNotificationPress(item) : undefined}
                  />
                );
              }}
              ListHeaderComponent={
                <NotificationFeedHeader
                  title={notificationsTitle}
                  unreadSummary={
                    unreadCount > 0
                      ? appLocale.startsWith('fr')
                        ? `${unreadCount} ${
                            unreadCount > 1
                              ? 'notifications non lues'
                              : 'notification non lue'
                          }`
                        : `${unreadCount} ${
                            unreadCount > 1
                              ? 'unread notifications'
                              : 'unread notification'
                          }`
                      : t('notifications.allRead')
                  }
                  hasUnread={unreadCount > 0}
                  markAllLabel={t('notifications.markAllRead')}
                  onMarkAllRead={handleMarkAllAsRead}
                  isDark={isDark}
                />
              }
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
              stickySectionHeadersEnabled={false}
              ListEmptyComponent={
                (() => {
                  // #region agent log
                  fetch('http://127.0.0.1:7678/ingest/e489a6eb-08fd-49a3-8970-439b9b875778',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'348b3c'},body:JSON.stringify({sessionId:'348b3c',runId:'pre-fix',hypothesisId:'H6',location:'notificationsPage.tsx:ListEmptyComponent',message:'empty notifications list rendered',data:{sectionCount:sections.length},timestamp:Date.now()})}).catch(()=>{});
                  // #endregion
                  return (
                <ErrorEmpty
                  isDark={isDark}
                  title={t(emptyTitleKeyNotifiction)}
                  description={t(emptyDescriptionKeyNotifiction)}
                />
                  );
                })()
              }
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 32 },
  item: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconText: { fontSize: 18, fontWeight: '700' },
  contentWrap: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  body: { fontSize: 13, marginBottom: 10, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 11, fontWeight: '500' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  bookingPreviewCard: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  previewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  previewLabel: { width: 72, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  previewValue: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  linkChip: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkChipText: { fontSize: 12, fontWeight: '700' },
  separator: { height: 12 },
  sectionHeaderWrap: { paddingHorizontal: 4, paddingBottom: 8 },
  sectionHeaderText: { fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  sectionSpacer: { height: 14 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
