import { apiFetch } from './apiConfig';

// GET /loc-cars?status=AVAILABLE
export function getLocCars(token?: string) {
  return apiFetch('/loc-cars?status=AVAILABLE', token, { method: 'GET' });
}

// GET /ta-cars?status=AVAILABLE
export function getTaCars(token?: string) {
  return apiFetch('/ta-cars?status=AVAILABLE', token, { method: 'GET' });
}

// GET /car  (liste de toutes les voitures)
export function getAllCars(token?: string) {
  return apiFetch('/car', token, { method: 'GET' });
}

// GET /car/:cid  (détail d'une voiture)
export function getCarById(carId: string, token?: string) {
  return apiFetch(`/car/${carId}`, token, { method: 'GET' });
}

// GET /car/category
export function getAllCarCategories(token?: string) {
  return apiFetch('/car/category', token, { method: 'GET' });
}