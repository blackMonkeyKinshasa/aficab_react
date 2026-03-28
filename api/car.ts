import { apiFetch } from './apiConfig';

//methode GET

export function getLocCars(token: string) {
  const endpoint = '/loc-cars';
  return apiFetch(endpoint, token, {
    method: 'GET',
  });
}

export function getTaCars(token: string) {
  const endpoint = '/ta-cars';
  return apiFetch(endpoint, token, {
    method: 'GET',
  });
}

export function getCars(token: string) {
  const endpoint = '/car';
  return apiFetch(endpoint, token, {
    method: 'GET',
  });
}