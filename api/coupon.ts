import { apiAuthFetch } from './apiConfig';
import { ValidateCouponInput, ValidateCouponResponse } from '@/constants/dataInterface';

export function validateCoupon(payload: ValidateCouponInput): Promise<ValidateCouponResponse> {
  return apiAuthFetch('/coupon/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}