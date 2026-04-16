
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
  label?: string;
  lat?: number;
  lng?: number;
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

export interface Booking {
  id: string;
  type: ResType;
  status: ResStatus;
  carId: string | null;
  clientId: string | null;
  clientPhone: string | null;
  driverId: string | null;
  departureAt: string;
  arrivalAt: string | null;
  departure: LocationPoint;
  arrival: LocationPoint | null;
  commentaire: string | null;
  isPaid: boolean;
  total: number | null;
  options: Record<string, unknown> | null;
  guest: Record<string, unknown> | null;
  name: string | null;
  reference: string | null;
  taVolNumber: string | null;
  taReturnId: string | null;
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

export type ActivityAction =
  | 'car-approved'
  | 'car-pending-approval'
  | 'driver-approved'
  | 'driver-pending-approval'
  | 'booking-new'
  | 'booking-driver-notify'
  | 'booking-driver-cancel';

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

export type PaymentMethod = "mpesa" | "orange" | "airtel" | "card"| "cash" ;


