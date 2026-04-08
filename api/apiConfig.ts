import { isDev } from "@/constants/env";

 
 export function apiFetch(endpoint: string, token?: string, options: any = {}) {

const API_URL = isDev ?  'https://aficab.vercel.app/api': 'https://aficab.com/api' ;

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':'d6986743-516e-4a0b-bc92-479bbd5fb3a1',
      
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
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
