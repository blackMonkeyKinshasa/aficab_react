import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SavedGuest = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedGuestInput = {
  fullName: string;
  phone: string;
  email?: string | null;
  note?: string | null;
};

function createId() {
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeEmail(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed.toLowerCase() : null;
}

export interface GuestsState {
  guests: SavedGuest[];
  addGuest: (input: SavedGuestInput) => SavedGuest;
  updateGuest: (id: string, input: SavedGuestInput) => SavedGuest | null;
  removeGuest: (id: string) => void;
  clearGuests: () => void;
  findDuplicate: (input: SavedGuestInput, excludeId?: string) => SavedGuest | null;
}

export const useGuestsState = create<GuestsState>()(
  persist(
    (set, get) => ({
      guests: [],

      findDuplicate: (input, excludeId) => {
        const phone = normalizePhone(input.phone);
        const email = normalizeEmail(input.email);
        return (
          get().guests.find((guest) => {
            if (excludeId && guest.id === excludeId) return false;
            if (phone && normalizePhone(guest.phone) === phone) return true;
            if (email && guest.email && guest.email === email) return true;
            return false;
          }) ?? null
        );
      },

      addGuest: (input) => {
        const now = new Date().toISOString();
        const guest: SavedGuest = {
          id: createId(),
          fullName: normalizeName(input.fullName),
          phone: input.phone.trim(),
          email: normalizeEmail(input.email),
          note: input.note?.trim() || null,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          guests: [guest, ...state.guests],
        }));

        return guest;
      },

      updateGuest: (id, input) => {
        const now = new Date().toISOString();
        let updated: SavedGuest | null = null;

        set((state) => ({
          guests: state.guests.map((guest) => {
            if (guest.id !== id) return guest;
            updated = {
              ...guest,
              fullName: normalizeName(input.fullName),
              phone: input.phone.trim(),
              email: normalizeEmail(input.email),
              note: input.note?.trim() || null,
              updatedAt: now,
            };
            return updated;
          }),
        }));

        return updated;
      },

      removeGuest: (id) =>
        set((state) => ({
          guests: state.guests.filter((guest) => guest.id !== id),
        })),

      clearGuests: () => set({ guests: [] }),
    }),
    {
      name: 'my-state-saved-guests',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
