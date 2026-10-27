
import { Role, ClientType, CarStatus, DriverStatus, ResStatus, ResType } from './databaseEnum';
import { Location } from './constants';

// --- LocationDoc : données saisies avant la sélection du véhicule ---

export interface LocationDocLOC {
  type: ResType.LOC;
  /** Point de départ */
  location: Location;
  dateStart: Date;
  dateEnd: Date;
}

export interface LocationDocTA {
  type: ResType.TA;
  tripType: 'one-way' | 'round-trip';
  /** Point de départ (ou adresse client) */
  locationDepart: Location;
  /** Destination (aéroport ou inversement) */
  locationDest: Location;
  dateStart: Date;
  /** Uniquement si tripType === 'round-trip' */
  dateReturn?: Date;
}

/** Union discriminée — utiliser `doc.type` pour distinguer LOC / TA */
export type LocationDoc = LocationDocLOC | LocationDocTA;

export interface GenderOptions {
  label: string;
  value: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  genre: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  clientType: ClientType;
  role: Role;
  organizationId: string | null;
  deviceToken: string | null;
  createdAt: string;
}

export interface LocationPoint {
  label: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  placeId?: string | null;
  /** API expects 'x' for longitude */
  x?: number;
  /** API expects 'y' for latitude */
  y?: number;
}

import { PaymentMethod } from './databaseEnum';
export { PaymentMethod };

export interface BookingGuest {
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
}

export interface BookingExtraTimeOption {
  name?: string | null;
  price?: number | null;
}

/** Catalogue line persisted by API (fuel, baby seat, …). */
export type BookingOptionLine = {
  name: string;
  price: number;
  number: number;
  required?: boolean;
};

/** @deprecated Prefer BookingOptionLine — same shape. */
export type BookingSelectedOption = BookingOptionLine;

/** API expects lowercase enum values. */
export type DayExtensionType = 'flex' | 'premium';

export interface DayExtension {
  /** Local calendar day YYYY-MM-DD */
  day: string;
  type: DayExtensionType;
}

export type BookingDayExtension = DayExtension;

/**
 * Persisted booking.options (POST/GET /booking).
 * Zod only keeps options / extraTime / dayExtensions.
 */
export interface BookingOptionsPayload {
  /** Catalogue lines (carburant, …) — unit price; LOC amount = price × number × days */
  options?: BookingOptionLine[];
  /** Legacy summary of extra hours (daily unit rate) */
  extraTime?: BookingExtraTimeOption | null;
  /** Flex/Premium per calendar day (recommended for LOC) */
  dayExtensions?: BookingDayExtension[];

  /** @deprecated Not persisted by API — UI/local only */
  fuel?: number;
  /** @deprecated Not persisted by API — UI/local only */
  flex?: number;
  /** @deprecated Not persisted by API — UI/local only */
  premium?: number;
  /** @deprecated Not persisted by API — derive from dates */
  rentalDays?: number;
  /** TA client helpers (may be stripped by API) */
  tripType?: 'one-way' | 'round-trip';
  distanceKm?: number | null;
  priceTA?: CarPriceTA | null;
  couponDiscountAmount?: number;
}

/** GET /booking/{id}/invoice — modèle décidé serveur via `proforma` */
export interface BookingInvoice {
  id: string; // "PRO-…" | "FAC-…"
  bookingId: string;
  proforma: boolean;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  currency: string;
  total: number | null;
  isPaid: boolean;
  status: string;
  deferredBilling: boolean;
  client: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  vehicle: string | null;
  service: string;
  departureAt: string | null;
  arrivalAt: string | null;
}

/** Body for POST /booking/quote */
export interface BookingQuoteInput {
  type: ResType;
  carId: string;
  departureAt: string;
  arrivalAt?: string;
  departure?: LocationPoint;
  arrival?: LocationPoint;
  options?: BookingOptionsPayload;
  couponCode?: string;
  taReturn?: boolean;
  distanceKm?: number | null;
}

export interface BookingQuoteResponse {
  total: number;
  currency?: string;
  originalTotal?: number;
  breakdown?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Body for POST /booking/{id}/client-update */
export interface ClientUpdateBookingInput {
  commentaire?: string | null;
  guest?: BookingGuest | null;
  departureAt?: string;
  arrivalAt?: string;
  options?: BookingOptionsPayload;
  [key: string]: unknown;
}

/** Body sent to POST /booking */
export interface CreateBookingInput {
  /** required — client-generated unique ID */
  id: string;
  /** required */
  carId: string;
  /** required */
  clientId: string;
  /** required */
  clientPhone: string;
  /** required */
  currency: string;
  /** required — ISO8601 */
  departureAt: string;
  /** required — { label, x, y } */
  departure: LocationPoint;
  /** required */
  paymentMethod: PaymentMethod;
  /** required */
  paymentProvider: string;
  /** required */
  total: number;
  // optional
  arrival?: LocationPoint;
  arrivalAt?: string;
  commentaire?: string;
  couponCode?: string;
  couponVehicleAmount?: number;
  guest?: BookingGuest;
  options?: BookingOptionsPayload;
  originalTotal?: number;
  paymentNumber?: string;
  reference?: string;
  type?: ResType;
  status?: string;
  taReturn?: boolean;
  taReturnAt?: string;
  taVolNumber?: string;
}

export interface PawapayPaymentInput {
  transaction_id: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentNumber: string;
}

export interface PawapayFailureReason {
  failureCode: string;
  failureMessage: string;
}

export interface PawapayPaymentResponse {
  depositId: string;
  status: string;
  requestedAmount: string;
  currency: string;
  payer: string;
  correspondent: string;
  created: string;
  metadata: Record<string, unknown> | null;
  failureReason: PawapayFailureReason | null;
}

export interface CarCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarPriceTA {
  min?: number | string | null;
  price?: number | string | null;
  red?: number | string | null;
  [key: string]: unknown;
}

export interface Car {
  id: string;
  name: string;
  registrationId: string;
  fuel: string;
  seats: number;
  baggage: number;
  mileage: number;
  priceLOC: number;
  status: CarStatus;
  category: CarCategory | null;
  categoryId: string | null;
  organization: OrganizationSummary | null;
  organizationId: string | null;
  defaultDriver: Driver | null;
  defaultDriverId: string | null;
  description: string | null;
  images: string[];
  features: any[];
  extraTime: Record<string, any>;
  priceOptions: any[];
  priceTA: CarPriceTA;
  createdAt: string;
  updatedAt: string;
}

export interface BookingCar {
  name: string;
  registrationId: string;
  images: unknown[];
  category: Record<string, unknown> | null;
  /** Present when API includes car pricing (needed for dayExtensions recap). */
  priceLOC?: number | null;
  extraTime?: { flex?: number; premium?: number } | null;
  priceOptions?: Array<{ name?: string; price?: number }> | null;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  licensePhoto: string | null;
  status: DriverStatus;
  note: string | null;
  user: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPayment {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentNumber: string;
  paymentProvider: string;
  createdAt: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paidAt: string | null;
  bookingId: string;
  clientId: string;
  booking?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
}

export interface BookingCoupon {
  id: string;
  bookingId: string;
  couponId: string;
  coupon: Record<string, unknown>;
  discountAmount: number;
  originalAmount: number;
  appliedAt: string;
}

export interface BookingReview {
  id: string;
  bookingId: string;
  clientId: string;
  driverId: string;
  comment: string | null;
  ratingDriving: number;
  ratingPunctuality: number;
  ratingService: number;
  ratingVehicle: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  bookingId: string;
  driverId: string;
  ratingDriving: number;
  ratingPunctuality: number;
  ratingService: number;
  ratingVehicle: number;
  comment: string;
}

export type CreateReviewResponse = BookingReview;

export interface ValidateCouponInput {
  code: string;
  carId: string;
  bookingType: 'LOC' | 'TA';
  vehicleAmount: number;
  orderTotal: number;
}

export interface CouponValidationInvalidResponse {
  valid: false;
  code: string;
  message: string;
  minAmount?: number;
}

export interface CouponValidationValidResponse {
  valid: true;
  code?: string;
  message?: string;
  discountAmount?: number;
  originalAmount?: number;
  finalAmount?: number;
  [key: string]: unknown;
}

export type ValidateCouponResponse = CouponValidationInvalidResponse | CouponValidationValidResponse;

export interface Booking {
  id: string;
  type: ResType;
  status: ResStatus;
  carId: string | null;
  clientId: string | null;
  clientPhone: string | null;
  currency?: string | null;
  driverId: string | null;
  departureAt: string;
  arrivalAt: string | null;
  departure: LocationPoint;
  arrival: LocationPoint | null;
  commentaire: string | null;
  couponCode?: string | null;
  couponVehicleAmount?: number | null;
  isPaid: boolean;
  originalTotal?: number | null;
  total: number | null;
  options: BookingOptionsPayload | null;
  guest: BookingGuest | null;
  name: string | null;
  reference: string | null;
  taReturn: boolean | null;
  taReturnAt: string | null;
  taVolNumber: string | null;
  rideStartAt: string | null;
  rideEndAt: string | null;
  cancelAt: string | null;
  cancelReason: string | null;
  createAt: string;
  updateAt: string;
  car: BookingCar | null;
  client: User | null;
  driver: Driver | null;
  coupon: BookingCoupon | null;
  review: BookingReview | null;
}

/** Réponse complète du serveur lors de la création d'une réservation */
export interface CreateBookingResponse extends Booking {
  payments: BookingPayment[];
  taParent: Booking | null;
}

export type ActivityAction =
  | 'car-approved'
  | 'car-pending-approval'
  | 'driver-approved'
  | 'driver-pending-approval'
  | 'booking-new'
  | 'booking-checkin'
  | 'booking-checkout'
  | 'booking-driver-notify'
  | 'booking-driver-cancel'
  | 'booking-client-cancel'
  | 'booking-auto-canceled';

export interface Activity {
  id: string;
  action: ActivityAction;
  target: string | null;
  link: string | null;
  isRead: boolean;
  createAt: string;
  userId: string | null;
  user: User | null;
  carId: string | null;
  car: Car | null;
  driverId: string | null;
  driver: Driver | null;
  bookingId: string | null;
  booking: Booking | null;
}




