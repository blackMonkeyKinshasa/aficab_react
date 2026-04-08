// Alternative: Using TypeScript enums

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DRIVER = 'DRIVER',
  CLIENT = 'CLIENT',
  PARTNER = 'PARTNER',
}

export enum ResType {
  LOC = 'LOC',
  TA = 'TA',
}

export enum ResStatus {
  PENDING = 'PENDING',
  PENDINGDRIVER = 'PENDINGDRIVER',
  CONFIRMED = 'CONFIRMED',
  STARTED = 'STARTED',
  ENDED = 'ENDED',
  CANCELED = 'CANCELED',
  ARCHIVED = 'ARCHIVED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export enum BookingCarCheckType {
  CHECKIN = 'CHECKIN',
  CHECKOUT = 'CHECKOUT',
}

export enum CarStatus {
  ONSERVICE = 'ONSERVICE',
  ONREPAIR = 'ONREPAIR',
  ARCHIVED = 'ARCHIVED',
  SELLED = 'SELLED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum DriverStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ONSERVICE = 'ONSERVICE',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum ClientType {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}