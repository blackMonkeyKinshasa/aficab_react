import { apiAuthFetch } from './apiConfig';
import { CreateReviewInput, CreateReviewResponse } from '@/constants/dataInterface';

export function createReview(reviewData: CreateReviewInput): Promise<CreateReviewResponse> {
  return apiAuthFetch('/review', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
}