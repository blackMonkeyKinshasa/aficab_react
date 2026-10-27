import { DayExtension, DayExtensionType } from '@/constants/dataInterface';

export type DayExtensionChoice = DayExtensionType | null;

export function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function listRentalDayKeys(startDate: Date, rentalDays: number): string[] {
  if (Number.isNaN(startDate.getTime()) || rentalDays < 1) {
    return [];
  }

  const keys: string[] = [];
  for (let index = 0; index < rentalDays; index += 1) {
    const dayDate = new Date(startDate);
    dayDate.setHours(0, 0, 0, 0);
    dayDate.setDate(dayDate.getDate() + index);
    keys.push(toLocalDayKey(dayDate));
  }
  return keys;
}

export function dayKeyToDate(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Normalize API / legacy values to the lowercase enum. */
export function normalizeDayExtensionType(
  value: string | null | undefined
): DayExtensionType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'flex') return 'flex';
  if (normalized === 'premium') return 'premium';
  return null;
}

export function tierToDayExtensionType(tier: 'flex' | 'premium' | null): DayExtensionType | null {
  if (tier === 'flex') return 'flex';
  if (tier === 'premium') return 'premium';
  return null;
}

/**
 * Intermediate helper: expand a global Flex/Premium choice into one entry per day.
 */
export function buildDayExtensionsFromGlobalTier(
  startDate: Date,
  rentalDays: number,
  tier: 'flex' | 'premium' | null
): DayExtension[] {
  const type = tierToDayExtensionType(tier);
  if (!type) {
    return [];
  }

  return listRentalDayKeys(startDate, rentalDays).map((day) => ({ day, type }));
}

export function dayExtensionMapToList(
  map: Record<string, DayExtensionChoice>
): DayExtension[] {
  return Object.entries(map)
    .map(([day, type]) => {
      const normalized = normalizeDayExtensionType(type);
      return normalized ? ({ day, type: normalized } as DayExtension) : null;
    })
    .filter((item): item is DayExtension => item !== null)
    .sort((a, b) => a.day.localeCompare(b.day));
}

export function countDayExtensionTypes(extensions: DayExtension[]) {
  return extensions.reduce(
    (acc, item) => {
      const type = normalizeDayExtensionType(item.type);
      if (type === 'flex') acc.flex += 1;
      if (type === 'premium') acc.premium += 1;
      return acc;
    },
    { flex: 0, premium: 0 }
  );
}

export function hasDayExtensionType(extensions: DayExtension[], type: DayExtensionType) {
  return extensions.some((item) => normalizeDayExtensionType(item.type) === type);
}
