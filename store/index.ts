import { useAppConfigState } from './app-config-state';
import { useGuestsState } from './guests-state';
import { useAppLanguageState } from './language-state';
import { useMyStateLocation } from './location-state';
import { useMyStateNotif } from './notification-state';
import { USER_CACHE_DURATION_MS, useMyStateUser, useUserStoreHydrated } from './user-state';

export {
  USER_CACHE_DURATION_MS,
  useAppConfigState,
  useAppLanguageState,
  useGuestsState,
  useMyStateLocation,
  useMyStateNotif,
  useMyStateUser,
  useUserStoreHydrated,
};

export function resetUserSessionState() {
  useMyStateUser.getState().clearUser();
  useMyStateLocation.getState().clearLocations();
  useMyStateNotif.getState().clearCountNotif({ resetUser: true });
  useGuestsState.getState().clearGuests();
}
