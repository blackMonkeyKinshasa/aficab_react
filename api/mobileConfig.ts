import { apiFetch } from './apiConfig';

//function GET
export function getAppConfiguration(token: string) {
  const url = '/mobile/config';
  return apiFetch(url, token, {
    method: 'GET',
  });
}