// --- Types Énumérés (basés sur vos valeurs) ---
export type UserRole = "ADMIN" | "USER" | string;
export type ClientType = "STANDARD" | "PREMIUM" | string;
export type BookingType = "LOC" | "TA";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | string;
export type EntityStatus = "PENDING_APPROVAL" | "ACTIVE" | string;

// --- Interfaces de base ---

export interface User {
  id: string;
  role: UserRole;
  clientType: ClientType;
  organizationId: string| null;
  full_name: string;
  email: string;
  phone: string| null;
  avatar_url: string| null;
  genre: string| null;
  address: string| null;
  city: string| null;
  country: string| null;
  deviceToken: string| null;
  createdAt: string;
}

export interface Booking {
  id: string;
  name: string;
  departure: any | null;
  departureAt: string;
  arrival: any | null;
  arrivalAt: string;
  type: BookingType;
  status: BookingStatus;
  clientId: string;
  clientPhone: string;
  driverId: string;
  carId: string;
  guest: any | null;
  createAt: string;
  updateAt: string;
  taVolNumber: string;
  commentaire: string;
  reference: string;
  rideStartAt: string;
  rideEndAt: string;
  isPaid: boolean;
  total: number;
  options: any | null;
  taReturnId: string;
  taReturn: any | null;
  taParent: any | null;
  cancelAt: string;
  cancelReason: string;
}

export interface Car {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  status: EntityStatus;
  images: string[];
  registrationId: string;
  baggage: number;
  fuel: string;
  seats: number;
  mileage: number;
  priceLOC: number;
  priceTA: number | null;
  extraTime: number | null;
  priceOptions: any | null;
  features: any | null;
  defaultDriverId: string;
  categoryId: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licensePhoto: string;
  licenseExpiry: string;
  note: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  user: User;
}

// --- Interface Principale (Notification/Action) ---

export interface NotificationAction {
  id: string;
  action: string;
  target: string;
  link: string;
  isRead: boolean;
  createAt: string;
  userId: string;
  bookingId: string;
  carId: string;
  driverId: string;
  user: User;
  booking: Booking;
  car: Car;
  driver: Driver;
}

// autre interface :
export interface Location {
  description: string;
  lat: number;
  lng: number;
}