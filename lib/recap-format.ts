import { Booking, BookingOptionsPayload } from '@/constants/dataInterface';
import { ResType } from '@/constants/databaseEnum';
import { normalizeDayExtensionType } from '@/lib/day-extensions';

export function formatRecapPrice(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRecapPriceWithCurrency(amount: number): string {
  return `${formatRecapPrice(amount)} USD`;
}

export type PriceRecapLine = {
  label: string;
  amount: number;
  group: 'rental' | 'catalog' | 'extraHours' | 'discount' | 'total';
};

type StoredOptions = BookingOptionsPayload;

function rentalDaysFromDates(departureAt?: string | null, arrivalAt?: string | null) {
  if (!departureAt || !arrivalAt) return 1;
  const start = new Date(departureAt);
  const end = new Date(arrivalAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function formatShortDayKey(dayKey: string, locale: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) return dayKey.slice(5);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}

function getExtraTimeUnit(
  car: Booking['car'],
  type: 'flex' | 'premium'
): number {
  const extra = car?.extraTime;
  if (!extra || typeof extra !== 'object') return 0;
  const value = type === 'premium' ? extra.premium : extra.flex;
  return typeof value === 'number' && value > 0 ? value : 0;
}

/**
 * Builds explicit price lines from persisted booking.options + car catalogue.
 * `booking.total` is authoritative for the final total line.
 */
export function buildPriceRecap(
  booking: Pick<
    Booking,
    'total' | 'type' | 'departureAt' | 'arrivalAt' | 'options' | 'car' | 'coupon' | 'originalTotal'
  > & {
    couponCode?: string | null;
  },
  labels: {
    rental: (days: number) => string;
    transfer: string;
    flex: string;
    premium: string;
    extraHoursFallback: string;
    discount: string;
    total: string;
    detailUnavailable?: string;
  },
  locale = 'fr-FR'
): {
  lines: PriceRecapLine[];
  rentalSubtotal: number;
  extraHoursSubtotal: number;
  catalogSubtotal: number;
  optionsMissing: boolean;
} {
  const opts = (booking.options ?? {}) as StoredOptions;
  const days = booking.type === ResType.LOC
    ? rentalDaysFromDates(booking.departureAt, booking.arrivalAt)
    : 1;
  const total = Number(booking.total) || 0;
  const discount =
    (typeof booking.coupon?.discountAmount === 'number' && booking.coupon.discountAmount > 0
      ? booking.coupon.discountAmount
      : 0) ||
    (typeof opts.couponDiscountAmount === 'number' && opts.couponDiscountAmount > 0
      ? opts.couponDiscountAmount
      : 0);

  const hasPersistedOptions = Boolean(
    booking.options &&
      (opts.options?.length ||
        opts.dayExtensions?.length ||
        (opts.extraTime && typeof opts.extraTime.price === 'number'))
  );

  const catalogLines: PriceRecapLine[] = [];
  for (const item of opts.options ?? []) {
    if (!item?.number || item.number <= 0) continue;
    const amount = Number(item.price) * Number(item.number) * days;
    if (amount <= 0) continue;
    catalogLines.push({ label: item.name, amount, group: 'catalog' });
  }

  const extraHourLines: PriceRecapLine[] = [];
  if (opts.dayExtensions?.length) {
    for (const ext of opts.dayExtensions) {
      const type = normalizeDayExtensionType(ext.type);
      if (!type) continue;
      let amount = getExtraTimeUnit(booking.car, type);
      // Fallback: legacy top-level flex/premium totals (old mobile payloads)
      if (amount <= 0 && type === 'flex' && typeof opts.flex === 'number') {
        const count = opts.dayExtensions.filter(
          (item) => normalizeDayExtensionType(item.type) === 'flex'
        ).length;
        amount = count > 0 ? opts.flex / count : opts.flex;
      }
      if (amount <= 0 && type === 'premium' && typeof opts.premium === 'number') {
        const count = opts.dayExtensions.filter(
          (item) => normalizeDayExtensionType(item.type) === 'premium'
        ).length;
        amount = count > 0 ? opts.premium / count : opts.premium;
      }
      if (amount <= 0 && opts.extraTime?.price && typeof opts.extraTime.price === 'number') {
        const name = (opts.extraTime.name ?? '').toLowerCase();
        if (
          (type === 'premium' && name.includes('premium')) ||
          (type === 'flex' && name.includes('flex'))
        ) {
          amount = Number(opts.extraTime.price);
        }
      }
      extraHourLines.push({
        label: `${type === 'premium' ? labels.premium : labels.flex} · ${formatShortDayKey(ext.day, locale)}`,
        amount: amount > 0 ? amount : 0,
        group: 'extraHours',
      });
    }
  } else if (opts.extraTime?.price) {
    const amount = Number(opts.extraTime.price) * days;
    if (amount > 0) {
      extraHourLines.push({
        label: opts.extraTime.name || labels.extraHoursFallback,
        amount,
        group: 'extraHours',
      });
    }
  } else {
    // Legacy ignored fields still present in optimistic local objects
    if (typeof opts.flex === 'number' && opts.flex > 0) {
      extraHourLines.push({
        label: labels.flex,
        amount: opts.flex,
        group: 'extraHours',
      });
    }
    if (typeof opts.premium === 'number' && opts.premium > 0) {
      extraHourLines.push({
        label: labels.premium,
        amount: opts.premium,
        group: 'extraHours',
      });
    }
  }

  const catalogSubtotal = catalogLines.reduce((sum, line) => sum + line.amount, 0);
  const extraHoursSubtotal = extraHourLines.reduce((sum, line) => sum + line.amount, 0);
  const extras = catalogSubtotal + extraHoursSubtotal;
  const vehicle = Math.max(0, total - extras + discount);

  const rentalLines: PriceRecapLine[] = [
    {
      label: booking.type === ResType.LOC ? labels.rental(days) : labels.transfer,
      amount: vehicle,
      group: 'rental',
    },
    ...catalogLines,
  ];

  // Legacy fuel field (optimistic / old)
  if (
    catalogLines.length === 0 &&
    typeof opts.fuel === 'number' &&
    opts.fuel > 0
  ) {
    rentalLines.push({
      label: 'Carburant',
      amount: opts.fuel,
      group: 'catalog',
    });
  }

  const lines: PriceRecapLine[] = [...rentalLines, ...extraHourLines];

  if (discount > 0) {
    const promo = booking.couponCode?.trim();
    lines.push({
      label: promo ? `${labels.discount} (${promo})` : labels.discount,
      amount: -discount,
      group: 'discount',
    });
  }

  lines.push({ label: labels.total, amount: total, group: 'total' });

  const rentalSubtotal = rentalLines.reduce((sum, line) => sum + line.amount, 0);

  return {
    lines,
    rentalSubtotal,
    extraHoursSubtotal,
    catalogSubtotal,
    optionsMissing: !hasPersistedOptions && extras <= 0 && !opts.fuel && !opts.flex && !opts.premium,
  };
}
