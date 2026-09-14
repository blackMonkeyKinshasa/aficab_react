export const BOOKING_MINUTE_STEP = 5;
export const MINIMUM_BOOKING_LEAD_TIME_HOURS = 24;

export function snapMinutesToStep(minutes: number, step: number = BOOKING_MINUTE_STEP): number {
  const normalized = ((minutes % 60) + 60) % 60;
  return (Math.round(normalized / step) * step) % 60;
}

export function hasMinimumBookingLeadTime(
  departureDate: Date,
  now: Date = new Date(),
  minimumHours: number = MINIMUM_BOOKING_LEAD_TIME_HOURS
) {
  if (Number.isNaN(departureDate.getTime())) {
    return false;
  }

  return departureDate.getTime() - now.getTime() >= minimumHours * 60 * 60 * 1000;
}
