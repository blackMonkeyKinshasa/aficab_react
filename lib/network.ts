import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export const NETWORK_UNAVAILABLE_CODE = 'NETWORK_UNAVAILABLE';

export class ApiNetworkError extends Error {
  readonly code = NETWORK_UNAVAILABLE_CODE;
  readonly status = 0;

  constructor(message = 'Aucune connexion Internet.') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

export function isNetInfoOnline(state: NetInfoState) {
  if (state.isConnected === false) {
    return false;
  }

  if (state.isInternetReachable === false) {
    return false;
  }

  return true;
}

export async function getIsOnline() {
  const state = await NetInfo.fetch();
  return isNetInfoOnline(state);
}

export function isApiNetworkError(error: unknown): error is ApiNetworkError {
  if (error instanceof ApiNetworkError) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: string }).code === NETWORK_UNAVAILABLE_CODE;
}

export function isNetworkFailure(error: unknown) {
  if (isApiNetworkError(error)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    error.name === 'TypeError' ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('internet')
  );
}
