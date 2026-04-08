import { apiFetch } from './apiConfig';

// GET /mobile/config
export function getAppConfiguration(token?: string) {
  return apiFetch('/mobile/config', token, { method: 'GET' });
}

// PATCH /mobile/config
export function updateMobileConfig(
  isMajeur: boolean,
  versionAndroid: number,
  versionIphone: number,
  token?: string
) {
  return apiFetch('/mobile/config', token, {
    method: 'PATCH',
    body: JSON.stringify({ is_majeur: isMajeur, version_android: versionAndroid, version_iphone: versionIphone }),
  });
}