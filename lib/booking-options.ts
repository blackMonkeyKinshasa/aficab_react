import {
  BookingDayExtension,
  BookingOptionsPayload,
  BookingSelectedOption,
  DayExtension,
} from '@/constants/dataInterface';

export type BuildBookingOptionsArgs = {
  fuelSelected: boolean;
  fuelOptionName: string | null;
  fuelUnitPrice: number | null;
  flexUnitPrice: number | null;
  premiumUnitPrice: number | null;
  dayExtensions?: DayExtension[];
};

/**
 * Builds API-compliant booking.options for POST /booking.
 * Only persists: options[], extraTime, dayExtensions.
 */
export function buildBookingOptions(args: BuildBookingOptionsArgs): BookingOptionsPayload {
  const lines: BookingSelectedOption[] = [];

  if (args.fuelSelected && args.fuelUnitPrice != null && args.fuelOptionName) {
    lines.push({
      name: args.fuelOptionName,
      price: args.fuelUnitPrice,
      number: 1,
    });
  }

  const out: BookingOptionsPayload = {};
  if (lines.length > 0) {
    out.options = lines;
  }

  const dayExtensions = Array.isArray(args.dayExtensions) ? args.dayExtensions : [];
  if (dayExtensions.length > 0) {
    out.dayExtensions = dayExtensions.map(
      (item): BookingDayExtension => ({
        day: item.day,
        type: item.type === 'premium' ? 'premium' : 'flex',
      })
    );

    const hasPremium = dayExtensions.some((item) => item.type === 'premium');
    const hasFlex = dayExtensions.some((item) => item.type === 'flex');

    if (hasPremium && args.premiumUnitPrice != null) {
      out.extraTime = { name: 'Premium', price: args.premiumUnitPrice };
    } else if (hasFlex && args.flexUnitPrice != null) {
      out.extraTime = { name: 'Flex', price: args.flexUnitPrice };
    }

    return out;
  }

  return out;
}
