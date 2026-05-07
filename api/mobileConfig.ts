import { apiFetch } from './apiConfig';

export interface AppConfiguration {
  id: string;
  version_client: number;
  version_driver: number;
  is_majeur: boolean;
  updatedAt: string;
}

// GET /mobile/config
export function getAppConfiguration() {
  return apiFetch('/mobile/config', { method: 'GET' }) as Promise<AppConfiguration>;
}

// PATCH /mobile/config
export function updateMobileConfig(
  isMajeur: boolean,
  versionAndroid: number,
  versionIphone: number
) {
  return apiFetch('/mobile/config', {
    method: 'PATCH',
    body: JSON.stringify({ is_majeur: isMajeur, version_android: versionAndroid, version_iphone: versionIphone }),
  });
}