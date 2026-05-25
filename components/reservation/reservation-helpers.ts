import { Booking } from '@/constants/dataInterface';
import { ResStatus } from '@/constants/databaseEnum';
import { TranslationKey } from '@/lib/i18n';

export const STATUS_COLORS: Record<ResStatus, string> = {
  [ResStatus.PENDING]: '#FFA500',
  [ResStatus.PENDINGDRIVER]: '#FFC107',
  [ResStatus.CONFIRMED]: '#2196F3',
  [ResStatus.STARTED]: '#9C27B0',
  [ResStatus.ENDED]: '#4CAF50',
  [ResStatus.CANCELED]: '#F44336',
  [ResStatus.ARCHIVED]: '#9E9E9E',
};

export const STATUS_LABELS: Record<ResStatus, TranslationKey> = {
  [ResStatus.PENDING]: 'reservations.status.pending',
  [ResStatus.PENDINGDRIVER]: 'reservations.status.pendingDriver',
  [ResStatus.CONFIRMED]: 'reservations.status.confirmed',
  [ResStatus.STARTED]: 'reservations.status.started',
  [ResStatus.ENDED]: 'reservations.status.ended',
  [ResStatus.CANCELED]: 'reservations.status.canceled',
  [ResStatus.ARCHIVED]: 'reservations.status.archived',
};

const CLIENT_CANCELLABLE_STATUSES: ResStatus[] = [
  ResStatus.PENDING,
  ResStatus.PENDINGDRIVER,
  ResStatus.CONFIRMED,
];

export const CAR_PLACEHOLDER = 'https://via.placeholder.com/120x80';

export function fmtDateTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDay(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fmtTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function canClientCancelBooking(booking: Booking) {
  if (!CLIENT_CANCELLABLE_STATUSES.includes(booking.status)) {
    return false;
  }

  if (!booking.departureAt) {
    return false;
  }

  const departureTime = new Date(booking.departureAt).getTime();

  if (Number.isNaN(departureTime)) {
    return false;
  }

  return departureTime - Date.now() >= 24 * 60 * 60 * 1000;
}

export function getCarImage(booking: Booking): string {
  const imgs = booking.car?.images;
  if (imgs && imgs.length > 0) return imgs[0] as string;
  return CAR_PLACEHOLDER;
}
