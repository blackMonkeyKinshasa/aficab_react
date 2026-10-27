import {
  BookingInvoice,
  BookingPayment,
  BookingQuoteInput,
  BookingQuoteResponse,
  ClientUpdateBookingInput,
  CreateBookingInput,
  CreateBookingResponse,
  CreateReviewResponse,
  LocationPoint,
  PawapayPaymentInput,
  PawapayPaymentResponse,
} from '@/constants/dataInterface';
import { apiAuthFetch, apiAuthFetchBinary } from './apiConfig';
import { ResType } from '@/constants/databaseEnum';
import { createReview } from './review';

export type GetBookingPaymentsParams = {
  clientId?: string;
  bookingId?: string;
  paymentMethod?: string;
  page?: string | number;
};

// GET /booking?clientId=xxx
export function getAllBookings(clientId?: string) {
  const query = clientId ? `?clientId=${clientId}` : '';
  return apiAuthFetch(`/booking${query}`, { method: 'GET' });
}

// GET /booking/payment?clientId=xxx&bookingId=xxx&paymentMethod=xxx&page=xxx
export function getBookingPayments(
  params: GetBookingPaymentsParams = {}
): Promise<BookingPayment[]> {
  const query = new URLSearchParams();

  if (params.clientId) query.set('clientId', params.clientId);
  if (params.bookingId) query.set('bookingId', params.bookingId);
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  if (params.page !== undefined) query.set('page', String(params.page));

  const queryString = query.toString();
  return apiAuthFetch<BookingPayment[]>(
    `/booking/payment${queryString ? `?${queryString}` : ''}`,
    { method: 'GET' }
  );
}

// GET /booking/generate-id?type=xxx
export function generateIDBooking(bookingType: ResType) {
  return apiAuthFetch(`/booking/generate-id?type=${bookingType}`, { method: 'GET' });
}

// GET /booking/:id
export function getBookingById(id: string) {
  return apiAuthFetch(`/booking/${id}`, { method: 'GET' });
}

// GET /booking/places?query=xxx
export function searchPlaces(query: string) {
  return apiAuthFetch(`/booking/places?query=${encodeURIComponent(query)}`, { method: 'GET' });
}

// POST /booking
export function createNewBooking(bookingData: CreateBookingInput): Promise<CreateBookingResponse> {
  return apiAuthFetch('/booking', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

// POST /booking/:id/client-cancel
export function clientCancelBooking(
  bookingId: string,
  status: string,
  clientId: string
) {
  return apiAuthFetch(`/booking/${bookingId}/client-cancel`, {
    method: 'POST',
    body: JSON.stringify({ status, clientId }),
  });
}

// POST /booking/:id/client-update
export function clientUpdateBooking(bookingId: string, body: ClientUpdateBookingInput) {
  return apiAuthFetch(`/booking/${bookingId}/client-update`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// GET /booking/:id/invoice
export function getBookingInvoice(bookingId: string): Promise<BookingInvoice> {
  return apiAuthFetch<BookingInvoice>(`/booking/${bookingId}/invoice`, { method: 'GET' });
}

// GET /booking/:id/invoice.pdf
export function getBookingInvoicePdf(bookingId: string) {
  return apiAuthFetchBinary(`/booking/${bookingId}/invoice.pdf`, { method: 'GET' });
}

// POST /booking/quote
export function quoteBooking(body: BookingQuoteInput): Promise<BookingQuoteResponse> {
  return apiAuthFetch<BookingQuoteResponse>('/booking/quote', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// POST /booking/directions
export function calculateDistance(
  origin: LocationPoint,
  destination: LocationPoint
): Promise<{ distanceMeters?: number }> {
  return apiAuthFetch<{ distanceMeters?: number }>('/booking/directions', {
    method: 'POST',
    body: JSON.stringify({ origin, destination }),
  });
}

// POST /booking/payment/maxicash
export function maxicashPay(
  transactionId: string,
  amount: string,
  currency: string,
  paymentMethod: string,
  paymentNumber: string
) {
  return apiAuthFetch('/booking/payment/maxicash', {
    method: 'POST',
    body: JSON.stringify({ reference: transactionId, amount, currency, paymentMethod, paymentNumber }),
  });
}

// POST /booking/payment/maxicash-card
export function maxicashVISA(
  transactionId: string,
  amount: string,
  currency: string,
  client: Record<string, unknown>,
  isMobile: boolean = true
) {
  return apiAuthFetch('/booking/payment/maxicash-card', {
    method: 'POST',
    body: JSON.stringify({ reference: transactionId, amount, currency, client, isMobile }),
  });
}

// POST /booking/payment/maxicash/status
export function checkPayment(
  referenceID: string,
  transactionId: string
) {
  return apiAuthFetch('/booking/payment/maxicash/status', {
    method: 'POST',
    body: JSON.stringify({ reference: referenceID, transactionId }),
  });
}

// POST /booking/payment/pawapay
export function pawapayPay(paymentData: PawapayPaymentInput): Promise<PawapayPaymentResponse> {
  return apiAuthFetch('/booking/payment/pawapay', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

// POST /review
export function postReview(
  bookingId: string,
  driverId: string,
  ratingDriving: number,
  ratingPunctuality: number,
  ratingVehicle: number,
  ratingService: number,
  comment: string = ''
): Promise<CreateReviewResponse> {
  return createReview({
    bookingId,
    driverId,
    ratingDriving,
    ratingPunctuality,
    ratingVehicle,
    ratingService,
    comment,
  });
}
