import { isDev } from "@/constants/env";

const API_URL = isDev ? 'https://aficab.vercel.app/api' : 'https://aficab.com/api';
const API_KEY = 'd6986743-516e-4a0b-bc92-479bbd5fb3a1';

export function apiFetch(endpoint: string, token?: string, options: any = {}) {
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  // Supprimer les entrées undefined (ex: Content-Type forcé à undefined)
  Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k]);

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
}
