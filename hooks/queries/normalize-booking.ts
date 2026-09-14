import { Booking } from '@/constants/dataInterface';

export function normalizeBookings(data: unknown): Booking[] {
  if (Array.isArray(data)) {
    return data as Booking[];
  }

  if (data && typeof data === 'object' && Array.isArray((data as { bookings?: unknown }).bookings)) {
    return (data as { bookings: Booking[] }).bookings;
  }

  return [];
}

export function normalizeBooking(data: unknown): Booking | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.id === 'string' && typeof record.status === 'string') {
    return data as Booking;
  }

  if (record.booking) {
    return normalizeBooking(record.booking);
  }

  return null;
}
