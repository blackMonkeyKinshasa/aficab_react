import type { TranslationKey } from '@/lib/i18n';

type TranslateFn = (key: TranslationKey) => string;
type TranslateFormatFn = (
  key: TranslationKey,
  values: Record<string, string | number | undefined>
) => string;

export type AuthErrorResult = {
  message: string;
  retryAfterSeconds?: number;
};

type AuthLikeError = {
  status?: number;
  code?: string;
  message?: string;
};

const RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_sms_send_rate_limit']);

function extractRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/after (\d+) seconds?/i);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function isRateLimitError(error: AuthLikeError): boolean {
  if (error.status === 429) {
    return true;
  }

  if (error.code && RATE_LIMIT_CODES.has(error.code)) {
    return true;
  }

  const normalizedMessage = error.message?.toLowerCase() ?? '';

  return (
    normalizedMessage.includes('for security purposes') || normalizedMessage.includes('rate limit')
  );
}

export function getAuthErrorMessage(
  error: AuthLikeError,
  t: TranslateFn,
  tf: TranslateFormatFn
): AuthErrorResult {
  const retryAfterSeconds = error.message ? extractRetryAfterSeconds(error.message) : undefined;

  if (isRateLimitError(error)) {
    const seconds = retryAfterSeconds ?? 60;

    return {
      message: tf('auth.otpRateLimit', { seconds }),
      retryAfterSeconds: seconds,
    };
  }

  const code = error.code?.toLowerCase() ?? '';
  const normalizedMessage = error.message?.toLowerCase() ?? '';

  if (code === 'otp_expired' || normalizedMessage.includes('expired')) {
    return { message: t('auth.otpExpired') };
  }

  if (
    code === 'otp_invalid' ||
    code === 'invalid_otp' ||
    normalizedMessage.includes('invalid otp') ||
    normalizedMessage.includes('token is invalid')
  ) {
    return { message: t('auth.otpInvalid') };
  }

  if (normalizedMessage.includes('invalid email')) {
    return { message: t('auth.invalidEmail') };
  }

  return { message: t('auth.genericError') };
}
