export const POLLING = {
  critical: 5_000,
  normal: 8_000,
  notifications: 12_000,
  none: false,
} as const;

export type PollingInterval =
  | number
  | false
  | undefined;
