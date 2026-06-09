import type { TranslationKey } from '@/lib/i18n';

type TranslateFn = (key: TranslationKey) => string;
type TranslateFormatFn = (
  key: TranslationKey,
  values: Record<string, string | number | undefined>
) => string;

type CouponFeedbackInput = {
  code?: string | null;
  message?: string | null;
  minAmount?: number;
};

const COUPON_CODE_TO_I18N: Record<string, TranslationKey> = {
  COUPON_NOT_FOUND: 'booking.promoCodeNotFound',
  COUPON_INACTIVE: 'booking.promoCodeInactive',
  COUPON_EXPIRED: 'booking.promoCodeExpired',
  COUPON_MAX_USES: 'booking.promoCodeMaxUses',
  COUPON_BOOKING_TYPE: 'booking.promoCodeBookingType',
  COUPON_CATEGORY: 'booking.promoCodeCategory',
  COUPON_MIN_ORDER: 'booking.promoCodeMinOrder',
  COUPON_INVALID_AMOUNT: 'booking.promoCodeInvalidAmount',
  COUPON_AMOUNT_INCONSISTENT: 'booking.promoCodeAmountInconsistent',
  COUPON_USER_LIMIT: 'booking.promoCodeAlreadyUsed',
  COUPON_CLIENT_REQUIRED: 'booking.promoCodeClientRequired',
  CAR_NOT_FOUND: 'booking.promoCodeCarNotFound',
  UNAUTHORIZED: 'booking.promoCodeUnauthorized',
  FORBIDDEN: 'booking.promoCodeForbidden',
};

function resolveCouponMessageKey(normalizedMessage: string): TranslationKey | null {
  if (normalizedMessage.includes('invalid coupon')) {
    return 'booking.promoCodeNotFound';
  }

  if (normalizedMessage.includes('not active')) {
    return 'booking.promoCodeInactive';
  }

  if (normalizedMessage.includes('expired')) {
    return 'booking.promoCodeExpired';
  }

  if (normalizedMessage.includes('maximum number of uses')) {
    return 'booking.promoCodeMaxUses';
  }

  if (normalizedMessage.includes('does not apply to this booking type')) {
    return 'booking.promoCodeBookingType';
  }

  if (normalizedMessage.includes('does not apply to this vehicle category')) {
    return 'booking.promoCodeCategory';
  }

  if (normalizedMessage.includes('minimum order amount')) {
    return 'booking.promoCodeMinOrder';
  }

  if (normalizedMessage.includes('invalid amount for coupon')) {
    return 'booking.promoCodeInvalidAmount';
  }

  if (normalizedMessage.includes('invalid vehicle vs order')) {
    return 'booking.promoCodeAmountInconsistent';
  }

  if (normalizedMessage.includes('already been used')) {
    return 'booking.promoCodeAlreadyUsed';
  }

  if (normalizedMessage.includes('clientid is required')) {
    return 'booking.promoCodeClientRequired';
  }

  if (normalizedMessage.includes('car not found')) {
    return 'booking.promoCodeCarNotFound';
  }

  if (normalizedMessage.includes('unauthorized') || normalizedMessage.includes('not autorized')) {
    return 'booking.promoCodeUnauthorized';
  }

  if (normalizedMessage.includes('cannot apply a coupon for this client')) {
    return 'booking.promoCodeForbidden';
  }

  return null;
}

function extractMinAmountFromMessage(message: string): number | undefined {
  const match = message.match(/minimum order amount for this coupon is ([\d.]+)/i);
  return match ? Number.parseFloat(match[1]) : undefined;
}

export function getCouponFeedbackMessage(
  input: CouponFeedbackInput,
  t: TranslateFn,
  tf: TranslateFormatFn
): string {
  const normalizedCode = input.code?.toUpperCase() ?? '';
  const normalizedMessage = input.message?.trim().toLowerCase() ?? '';
  const key =
    COUPON_CODE_TO_I18N[normalizedCode] ??
    (normalizedMessage ? resolveCouponMessageKey(normalizedMessage) : null);

  if (!key) {
    return t('booking.promoCodeInvalid');
  }

  if (key === 'booking.promoCodeMinOrder') {
    const minAmount =
      input.minAmount ?? (input.message ? extractMinAmountFromMessage(input.message) : undefined);

    if (minAmount != null && Number.isFinite(minAmount)) {
      return tf('booking.promoCodeMinOrder', { minAmount });
    }
  }

  return t(key);
}
