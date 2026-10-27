import {
  getPermissionsAsync,
  presentContactPickerAsync,
  requestPermissionsAsync,
  type Contact,
} from 'expo-contacts/legacy';
import { Platform } from 'react-native';

export type PickedContactGuest = {
  fullName: string;
  phone: string;
  email: string;
};

export class ContactPickError extends Error {
  code: 'unsupported' | 'permission_denied' | 'phone_missing' | 'failed';

  constructor(code: ContactPickError['code'], message?: string) {
    super(message ?? code);
    this.name = 'ContactPickError';
    this.code = code;
  }
}

export function normalizeGuestPhone(phoneNumber: string | null | undefined) {
  if (!phoneNumber) {
    return '';
  }

  const digits = phoneNumber.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('243') && digits.length >= 12) {
    return digits.slice(3, 12);
  }

  if (digits.startsWith('0') && digits.length >= 10) {
    return digits.slice(1, 10);
  }

  if (digits.length > 9) {
    return digits.slice(-9);
  }

  return digits;
}

function mapLegacyContact(contact: Contact): PickedContactGuest {
  const fullName =
    contact.name?.trim() ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();

  const phone =
    contact.phoneNumbers
      ?.map((item) => normalizeGuestPhone(item.number || item.digits))
      .find((value) => value.length > 0) ?? '';

  const email =
    contact.emails
      ?.map((item) => item.email?.trim() ?? '')
      .find((value) => value.length > 0) ?? '';

  return {
    fullName,
    phone,
    email,
  };
}

/**
 * Opens the native contact picker and returns guest-ready fields.
 * Uses expo-contacts/legacy because presentContactPickerAsync returns
 * the full contact payload in one shot (reliable for form autofill).
 */
export async function pickGuestFromContacts(): Promise<PickedContactGuest | null> {
  if (Platform.OS === 'web') {
    throw new ContactPickError('unsupported');
  }

  const { status: existingStatus } = await getPermissionsAsync();
  const finalStatus =
    existingStatus === 'granted'
      ? existingStatus
      : (await requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    throw new ContactPickError('permission_denied');
  }

  const contact = await presentContactPickerAsync();

  if (!contact) {
    return null;
  }

  return mapLegacyContact(contact);
}
