
 export function apiFetch(endpoint: string, token?: string, options: any = {}) {

const API_URL = 'https://aficab.com/api';
//const API_URL = 'https://aficab.vercel.app/api';

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      
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
