import { useEffect, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { usePreventRemove } from '@react-navigation/native';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { getActivity, readNotification } from '@/api/activity';
import { ErrorEmpty } from '@/components/my-ui/errorEmpty';
import { LoadingView } from '@/components/my-ui/LoadingView';
import { buildStackScreenOptions } from '@/components/my-ui/ScreenHeader';
import { color } from '@/constants/colors';
import { Activity, ActivityAction } from '@/constants/dataInterface';
import { TranslationKey, useI18n } from '@/lib/i18n';
import { clearNotificationBadgeAsync } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useMyStateNotif } from '@/store/notification-state';

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

  const booking = activity.booking;
  const routeParts = [booking.departure?.label, booking.arrival?.label].filter(
    (value): value is string => Boolean(value && value !== 'N/A')
  );

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
    route: routeParts.length > 0 ? routeParts.join(' → ') : '—',
  };
}

function getActionMeta(
  action: ActivityAction,
  activity: Activity,
  t: ReturnType<typeof useI18n>['t'],
  tf: ReturnType<typeof useI18n>['tf'],
  appLocale: string
) {
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
        icon: '✓',
        tone: '#16a34a',
      };
    case 'car-pending-approval':
      return {
        title: t('notifications.action.carPending.title'),
        body: tf('notifications.action.carPending.message', { target: activity.target ?? '' }),
        icon: '…',
        tone: '#f59e0b',
      };
    case 'driver-approved':
      return {
        title: t('notifications.action.driverApproved.title'),
        body: tf('notifications.action.driverApproved.message', { target: activity.target ?? '' }),
        icon: '✓',
        tone: '#16a34a',
      };
    case 'driver-pending-approval':
      return {
        title: t('notifications.action.driverPending.title'),
        body: tf('notifications.action.driverPending.message', { target: activity.target ?? '' }),
        icon: '…',
        tone: '#f59e0b',
      };
    case 'booking-new':
      return {
        title: 'Reservation confirmee',
        body: schedule
          ? `Votre reservation ${bookingLabel ? `pour ${bookingLabel} ` : ''}est confirmee. Prevue le ${schedule}.`
          : `Votre reservation ${bookingLabel ? `pour ${bookingLabel} ` : ''}est confirmee.`,
        icon: '↗',
        tone: '#2563eb',
      };
    case 'booking-checkin':
    case 'booking-checkout':
      return {
        title: 'Chauffeur en route',
        body: [
          'Votre chauffeur est en route.',
          driverName ? `${driverName} vient de demarrer.` : '',
          carName ? `${carName}${carPlate ? ` [${carPlate}]` : ''}.` : '',
          schedule ? `Arrivee estimee : ${schedule}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        icon: '🚗',
        tone: '#7c3aed',
      };
    case 'booking-driver-notify':
      return {
        title: 'Chauffeur notifie',
        body: activity.bookingId
          ? `Le chauffeur a ete notifie pour la reservation ${activity.bookingId}.`
          : 'Le chauffeur a ete notifie pour votre reservation.',
        icon: '🔔',
        tone: '#ea580c',
      };
    case 'booking-driver-cancel':
      return {
        title: 'Reservation refusee',
        body: driverName
          ? `${driverName} a refuse la reservation${activity.bookingId ? ` ${activity.bookingId}` : ''}.`
          : `Votre reservation${activity.bookingId ? ` ${activity.bookingId}` : ''} a ete refusee.`,
        icon: '!',
        tone: '#dc2626',
      };
    case 'booking-client-cancel':
      return {
        title: 'Reservation annulee',
        body: `La reservation${activity.bookingId ? ` ${activity.bookingId}` : ''} a ete annulee.`,
        icon: '!',
        tone: '#dc2626',
      };
    case 'booking-auto-canceled':
      return {
        title: 'Reservation annulee automatiquement',
        body: `La reservation${activity.bookingId ? ` ${activity.bookingId}` : ''} a ete annulee par le systeme car elle n'a pas ete honoree avant la date de depart.`,
        icon: '!',
        tone: '#dc2626',
      };
    default:
      return {
        title: 'Nouvelle activite',
        body: activity.target ?? '',
        icon: '•',
        tone: '#6b7280',
      };
  }
}

function NotificationItem({
  item,
  isDark,
  onPress,
  t,
  tf,
  appLocale,
}: {
  item: Activity;
  isDark: boolean;
  onPress: () => void;
  t: ReturnType<typeof useI18n>['t'];
  tf: ReturnType<typeof useI18n>['tf'];
  appLocale: string;
}) {
  const meta = getActionMeta(item.action, item, t, tf, appLocale);
  const relativeDate = formatRelativeDate(item.createAt, appLocale);
  const canOpenBooking = Boolean(item.bookingId);
  const bookingPreview = getBookingPreview(item, appLocale);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.item,
        { backgroundColor: isDark ? '#17181c' : '#ffffff' },
        !item.isRead && { borderColor: meta.tone, borderWidth: 1.5 },
      ]}>
      <View style={styles.itemRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.tone}22` }]}>
          <Text style={[styles.iconText, { color: meta.tone }]}>{meta.icon}</Text>
        </View>

        <View style={styles.contentWrap}>
          <View style={styles.itemHeader}>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]} numberOfLines={2}>
              {meta.title}
            </Text>
            {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: meta.tone }]} />}
          </View>

          <Text style={[styles.body, { color: isDark ? '#c7c7cc' : '#4b5563' }]} numberOfLines={3}>
            {meta.body}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.date, { color: isDark ? '#7c7c84' : '#6b7280' }]}>
              {relativeDate}
            </Text>
            <Text style={[styles.date, { color: isDark ? '#5f5f66' : '#9ca3af' }]}>•</Text>
            <Text style={[styles.date, { color: isDark ? '#7c7c84' : '#6b7280' }]}>
              {formatDate(item.createAt, appLocale)}
            </Text>
          </View>

          {bookingPreview ? (
            <View
              style={[
                styles.bookingPreviewCard,
                { backgroundColor: isDark ? '#202127' : '#f8fafc' },
              ]}>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  {t('reservations.field.vehicle')}
                </Text>
                <Text
                  style={[styles.previewValue, { color: isDark ? '#ffffff' : '#111827' }]}
                  numberOfLines={1}>
                  {bookingPreview.vehicle}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  {t('reservations.field.departure')}
                </Text>
                <Text
                  style={[styles.previewValue, { color: isDark ? '#ffffff' : '#111827' }]}
                  numberOfLines={1}>
                  {bookingPreview.departureTime}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  {t('reservations.section.places')}
                </Text>
                <Text
                  style={[styles.previewValue, { color: isDark ? '#ffffff' : '#111827' }]}
                  numberOfLines={2}>
                  {bookingPreview.route}
                </Text>
              </View>
            </View>
          ) : null}

          {canOpenBooking ? (
            <View style={[styles.linkChip, { backgroundColor: isDark ? '#26272b' : '#f3f4f6' }]}>
              <Text style={[styles.linkChipText, { color: meta.tone }]}>
                {t('notifications.openBooking')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Notifications() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t, tf, appLocale } = useI18n();
  const router = useRouter();
  const emptyTitleKeyNotifiction: TranslationKey = 'notifications.empty.title';
  const emptyDescriptionKeyNotifiction: TranslationKey = 'notifications.empty.description';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { clearCountNotif, decrementCountNotif, setCountNotif } = useMyStateNotif();

  const navigation = useNavigation();
  const isMarkingAsReadRef = useRef(false);

  useEffect(() => {
    clearNotificationBadgeAsync().catch(() => {
      // Le reset du badge reste silencieux si la plateforme ne le prend pas en charge.
    });
  }, []);

  const sections = useMemo(() => {
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

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          getActivity({ userId: user.id })
            .then((data) => {
              setActivities(data);
              setCountNotif(data.filter((activity: Activity) => !activity.isRead).length);
            })
            .catch(() => setError(t('notifications.loadError')))
            .finally(() => setLoading(false));
        }
      })
      .catch(() => {
        setError(t('notifications.loadError'));
        setLoading(false);
      });
  }, [setCountNotif, t]);

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
          setActivities((currentActivities) =>
            currentActivities.map((activity) =>
              activity.isRead ? activity : { ...activity, isRead: true }
            )
          );
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

  const handleNotificationPress = (selectedActivity: Activity) => {
    let shouldCallApi = false;

    setActivities((currentActivities) =>
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

    readNotification(selectedActivity.id)
      .then(openRelatedBooking)
      .catch(() => {
        setActivities((currentActivities) =>
          currentActivities.map((activityItem) =>
            activityItem.id === selectedActivity.id
              ? { ...activityItem, isRead: false }
              : activityItem
          )
        );
        setCountNotif(activities.filter((activity) => !activity.isRead).length);
      });
  };

  return (
    <>
      <Stack.Screen
        options={buildStackScreenOptions({
          title: t('notifications.title'),
          isDark,
          canGoBack: true,
        })}
      />
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? color.appDarkBackground : '#f2f2f7' },
        ]}>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#555' }]}>{error}</Text>
        ) : (
          <View style={{ flex: 1, width: '100%' }}>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeaderWrap}>
                  <Text
                    style={[styles.sectionHeaderText, { color: isDark ? '#f3f4f6' : '#111827' }]}>
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <NotificationItem
                  item={item}
                  isDark={isDark}
                  onPress={() => handleNotificationPress(item)}
                  t={t}
                  tf={tf}
                  appLocale={appLocale}
                />
              )}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
              stickySectionHeadersEnabled={false}
              ListEmptyComponent={
                <ErrorEmpty
                  isDark={isDark}
                  title={t(emptyTitleKeyNotifiction)}
                  description={t(emptyDescriptionKeyNotifiction)}
                />
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
  list: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 32 },
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
  separator: { height: 10 },
  sectionHeaderWrap: { paddingHorizontal: 4, paddingBottom: 8 },
  sectionHeaderText: { fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  sectionSpacer: { height: 14 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
