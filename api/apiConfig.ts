import { isDev } from "@/constants/env";
import { supabase } from '@/lib/supabase';

const API_URL = isDev ? 'https://aficab.vercel.app/api' : 'https://aficab.com/api';

function shouldSkipErrorLog(endpoint: string, errorBody: any) {
  return Boolean(errorBody?.code === 'USER_NOT_FOUND' && endpoint.startsWith('/user/'));
}

function buildApiError(response: Response, errorBody: any) {
  const message = errorBody?.message ?? errorBody?.error ?? JSON.stringify(errorBody) ?? `Erreur HTTP: ${response.status}`;
  const error = new Error(message) as Error & { status?: number; code?: string; body?: any };

  error.status = response.status;
  error.code = errorBody?.code;
  error.body = errorBody;

  return error;
}

async function parseErrorResponse(response: Response) {
  let errorBody: any = null;

  try {
    errorBody = await response.json();
  } catch {
    errorBody = await response.text().catch(() => null);
  }

  return errorBody;
}

async function performFetch(endpoint: string, headers: Record<string, string>, options: any = {}) {
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}


export async function getAccessToken() {
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token;
}

export async function getRequiredAccessToken() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Token d\'authentification introuvable. Reconnectez-vous puis reessayez.');
  }

  return accessToken;
}

export async function apiFetch(endpoint: string, options: any = {}) {
  const isFormData = options.body instanceof FormData;
  const resolvedToken = await getAccessToken();

  const headers: Record<string, string> = {
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  // Supprimer les entrées undefined (ex: Content-Type forcé à undefined)
  Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k]);

  const response = await performFetch(endpoint, headers, options);

  if (response.status === 401 && resolvedToken) {
    const { data, error } = await supabase.auth.refreshSession();
    const refreshedToken = data.session?.access_token;

    if (!error && refreshedToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${refreshedToken}`,
      };

      const retryResponse = await performFetch(endpoint, retryHeaders, options);

      if (retryResponse.ok) {
        return retryResponse.json();
      }

      const retryErrorBody = await parseErrorResponse(retryResponse);
      if (!shouldSkipErrorLog(endpoint, retryErrorBody)) {
        console.error(`Erreur HTTP ${retryResponse.status} sur ${endpoint}:`, retryErrorBody);
      }
      throw buildApiError(retryResponse, retryErrorBody);
    }
  }

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('Fichier trop volumineux. Choisissez une image plus legere.');
    }

    const errorBody = await parseErrorResponse(response);
    if (!shouldSkipErrorLog(endpoint, errorBody)) {
      console.error(`Erreur HTTP ${response.status} sur ${endpoint}:`, errorBody);
    }
    throw buildApiError(response, errorBody);
  }

  return response.json();
}

export async function apiAuthFetch(endpoint: string, options: any = {}) {
  const resolvedToken = await getRequiredAccessToken();
  return apiFetch(endpoint, { ...options, headers: { ...options.headers, Authorization: `Bearer ${resolvedToken}` } });
}
