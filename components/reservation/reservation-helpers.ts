import { Booking } from '@/constants/dataInterface';
import { ResStatus, ResType } from '@/constants/databaseEnum';
import { TranslationKey } from '@/lib/i18n';

const DAY_MS = 1000 * 60 * 60 * 24;

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

export function toValidDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getRentalDays(booking: Booking) {
  if (typeof booking.options?.rentalDays === 'number' && booking.options.rentalDays > 0) {
    return Math.max(1, Math.ceil(booking.options.rentalDays));
  }

  const startDate = toValidDate(booking.departureAt);
  const endDate = toValidDate(booking.arrivalAt);

  if (!startDate || !endDate) {
    return 1;
  }

  const diffInMs = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diffInMs / DAY_MS));
}

export function getCurrentRentalDay(booking: Booking, rentalDays = getRentalDays(booking)) {
  const startDate = toValidDate(booking.departureAt);
  if (!startDate) {
    return 1;
  }

  const now = Date.now();
  if (now <= startDate.getTime()) {
    return 1;
  }

  const elapsedDays = Math.floor((now - startDate.getTime()) / DAY_MS) + 1;
  return Math.min(rentalDays, Math.max(1, elapsedDays));
}

export function isMultiDayRental(booking: Booking) {
  return booking.type === ResType.LOC && getRentalDays(booking) > 1;
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
