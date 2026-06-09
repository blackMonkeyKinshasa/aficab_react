export const BOOKING_MINUTE_STEP = 5;

export function snapMinutesToStep(minutes: number, step: number = BOOKING_MINUTE_STEP): number {
  const normalized = ((minutes % 60) + 60) % 60;
  return (Math.round(normalized / step) * step) % 60;
}
