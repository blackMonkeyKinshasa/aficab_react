import { isDev } from '@/constants/env';
import {
  ApiNetworkError,
  getIsOnline,
  isNetworkFailure,
} from '@/lib/network';
import { supabase } from '@/lib/supabase';

const API_URL = isDev ? 'https://aficab.vercel.app/api' : 'https://aficab.com/api';

export type ApiRequestOptions = Omit<RequestInit, 'headers' | 'body'> & {
  headers?: Record<string, string | undefined>;
  body?: RequestInit['body'];
};

export type ApiErrorBody = {
  message?: string;
  error?: string;
  code?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  body?: unknown;

  constructor(message: string, options?: { status?: number; code?: string; body?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.body = options?.body;
  }
}

export function isNotFoundError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { status?: number }).status === 404;
}

function shouldSkipErrorLog(endpoint: string, errorBody: unknown) {
  return Boolean(
    errorBody &&
      typeof errorBody === 'object' &&
      'code' in errorBody &&
      (errorBody as ApiErrorBody).code === 'USER_NOT_FOUND' &&
      endpoint.startsWith('/user/')
  );
}

function buildApiError(response: Response, errorBody: unknown) {
  const parsedBody =
    errorBody && typeof errorBody === 'object' ? (errorBody as ApiErrorBody) : null;
  const message =
    parsedBody?.message ??
    parsedBody?.error ??
    (typeof errorBody === 'string' ? errorBody : null) ??
    `Erreur HTTP: ${response.status}`;

  return new ApiError(message, {
    status: response.status,
    code: parsedBody?.code,
    body: errorBody,
  });
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return response.text().catch(() => null);
  }
}

async function performFetch(endpoint: string, headers: Record<string, string>, options: ApiRequestOptions = {}) {
  const isOnline = await getIsOnline();

  if (!isOnline) {
    throw new ApiNetworkError();
  }

  try {
    return await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (isNetworkFailure(error) || error instanceof TypeError) {
      throw new ApiNetworkError();
    }

    throw error;
  }
}

function resolveHeaders(
  options: ApiRequestOptions,
  accessToken?: string | null
): Record<string, string> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
  };

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (value !== undefined) {
        headers[key] = value;
      }
    }
  }

  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined) {
      delete headers[key];
    }
  });

  return headers;
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
    throw new Error("Token d'authentification introuvable. Reconnectez-vous puis reessayez.");
  }

  return accessToken;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const resolvedToken = await getAccessToken();
  const headers = resolveHeaders(options, resolvedToken);
  const response = await performFetch(endpoint, headers, options);

  if (response.status === 401 && resolvedToken) {
    const { data, error } = await supabase.auth.refreshSession();
    const refreshedToken = data.session?.access_token;

    if (!error && refreshedToken) {
      const retryHeaders = resolveHeaders(options, refreshedToken);
      const retryResponse = await performFetch(endpoint, retryHeaders, options);

      if (retryResponse.ok) {
        return retryResponse.json() as Promise<T>;
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
      throw new ApiError('Fichier trop volumineux. Choisissez une image plus legere.', {
        status: 413,
      });
    }

    const errorBody = await parseErrorResponse(response);
    if (!shouldSkipErrorLog(endpoint, errorBody)) {
      console.error(`Erreur HTTP ${response.status} sur ${endpoint}:`, errorBody);
    }
    throw buildApiError(response, errorBody);
  }

  return response.json() as Promise<T>;
}

export async function apiAuthFetch<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const resolvedToken = await getRequiredAccessToken();
  return apiFetch<T>(endpoint, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${resolvedToken}` },
  });
}
