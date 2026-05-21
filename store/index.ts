import { useAppConfigState } from './app-config-state';
import { useAppLanguageState } from './language-state';
import { useMyStateLocation } from './location-state';
import { useMyStateNotif } from './notification-state';
import { USER_CACHE_DURATION_MS, useMyStateUser } from './user-state';

export {
	USER_CACHE_DURATION_MS,
	useAppConfigState,
	useAppLanguageState,
	useMyStateLocation,
	useMyStateNotif,
	useMyStateUser,
};

export function resetUserSessionState() {
	useMyStateUser.getState().clearUser();
	useMyStateLocation.getState().clearLocations();
	useMyStateNotif.getState().clearCountNotif();
}