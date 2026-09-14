import { apiFetch } from './apiConfig';

export interface AppConfiguration {
  id: string;
  version_client: number;
  version_driver: number;
  is_majeur: boolean;
  updatedAt: string;
}

function isAppConfiguration(value: unknown): value is AppConfiguration {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.version_client === 'number';
}

// GET /mobile/config
export async function getAppConfiguration(): Promise<AppConfiguration> {
  const data = await apiFetch<AppConfiguration>('/mobile/config', { method: 'GET' });

  if (!isAppConfiguration(data)) {
    throw new Error('Configuration mobile invalide.');
  }

  return data;
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