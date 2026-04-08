import { Booking, LocationPoint } from '@/constants/dataInterface';
import { apiFetch } from './apiConfig';
import { ResType } from '@/constants/databaseEnum';

// GET /booking?clientId=xxx
export function getAllBookings(clientId?: string, token?: string) {
  const query = clientId ? `?clientId=${clientId}` : '';
  return apiFetch(`/booking${query}`, token, { method: 'GET' });
}

// GET /booking/generate-id?type=xxx
export function generateIDBooking(bookingType: ResType, token?: string) {
  return apiFetch(`/booking/generate-id?type=${bookingType}`, token, { method: 'GET' });
}

// GET /booking/:id
export function getBookingById(id: string, token?: string) {
  return apiFetch(`/booking/${id}`, token, { method: 'GET' });
}

// GET /booking/places?query=xxx
export function searchPlaces(query: string, token?: string) {
  return apiFetch(`/booking/places?query=${encodeURIComponent(query)}`, token, { method: 'GET' });
}

// POST /booking
export function createNewBooking(bookingData: Partial<Booking>, token?: string) {
  return apiFetch('/booking', token, {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

// POST /booking/:id/client-cancel
export function clientCancelBooking(
  bookingId: string,
  status: string,
  clientId: string,
  token?: string
) {
  return apiFetch(`/booking/${bookingId}/client-cancel`, token, {
    method: 'POST',
    body: JSON.stringify({ status, clientId }),
  });
}

// POST /booking/directions
export function calculateDistance(
  origin: LocationPoint,
  destination: LocationPoint,
  token?: string
) {
  return apiFetch('/booking/directions', token, {
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
  paymentNumber: string,
  token?: string
) {
  return apiFetch('/booking/payment/maxicash', token, {
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
  isMobile: boolean = true,
  token?: string
) {
  return apiFetch('/booking/payment/maxicash-card', token, {
    method: 'POST',
    body: JSON.stringify({ reference: transactionId, amount, currency, client, isMobile }),
  });
}

// POST /booking/payment/maxicash/status
export function checkPayment(
  referenceID: string,
  transactionId: string,
  token?: string
) {
  return apiFetch('/booking/payment/maxicash/status', token, {
    method: 'POST',
    body: JSON.stringify({ reference: referenceID, transactionId }),
  });
}

// POST /review
export function postReview(
  bookingId: string,
  ratingDriving: number,
  ratingPunctuality: number,
  ratingVehicle: number,
  ratingService: number,
  comment: string = '',
  token?: string
) {
  return apiFetch('/review', token, {
    method: 'POST',
    body: JSON.stringify({ bookingId, ratingDriving, ratingPunctuality, ratingVehicle, ratingService, comment }),
  });
}
