export const BOOKING_MINUTE_STEP = 5;

export function snapMinutesToStep(minutes: number, step: number = BOOKING_MINUTE_STEP): number {
  const normalized = ((minutes % 60) + 60) % 60;
  return (Math.round(normalized / step) * step) % 60;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/** Earliest selectable booking date: tomorrow at local midnight. */
export function getEarliestBookingDate(now: Date = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/** Returns true when departure is scheduled on a day after today (same-day bookings are rejected). */
export function hasMinimumBookingLeadTime(departureDate: Date, now: Date = new Date()) {
  if (Number.isNaN(departureDate.getTime())) {
    return false;
  }

  return !isSameCalendarDay(departureDate, now);
}
