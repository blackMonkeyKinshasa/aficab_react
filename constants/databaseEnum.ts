// Alternative: Using TypeScript enums

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DRIVER = 'DRIVER',
  CLIENT = 'CLIENT',
  PARTNER = 'PARTNER',
  ORG_BOOKER= 'ORG_BOOKER',
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

export enum EtapeReservation{
    SELECTION = 'SELECTION',
    OPTION = 'OPTION',
    RECAP = 'RECAP',
}

export enum PaymentMethod {
  mpesa = 'mpesa',
  orange = 'orangemoney',
  airtel = 'airtelmoney',
  cash = 'cash',
  card = 'card',
}

export enum PaymentProvider {
 mobileMoney = 'pawapay',
  cash = 'aficab',
  card = 'maxicash',
}

export const SUPPORT_PHONE = '+243973266842';
export const SUPPORT_WHATSAPP_URL = 'https://wa.me/243973266842';
export const SUPPORT_EMAIL_URL = 'https://share.hsforms.com/ui-forms-embed-components-app.html?_hsFormId=a43ced7c-5db7-4ba2-ba26-8fe826dbc96b&_hsPortalId=148147392&_hsHublet=eu1&_hsIsQa=false&_hsDisableScriptloader=true&_hsBufferKey=U%2BjClyRqQkh%2BuYYR%2F6KuTrX5eyAMapI567ERqHJroug%3D&_hsIsPreview=true&_hsAllowUnpublished=true';