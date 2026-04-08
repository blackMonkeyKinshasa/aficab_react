import { User } from '@/constants/dataInterface';
import { apiFetch } from './apiConfig';

// GET /user/:uid
export function getUserByID(userId: string, token?: string) {
  return apiFetch(`/user/${userId}`, token, { method: 'GET' });
}

// PATCH /user/:uid
export function updateUserByID(userId: string, updates: Partial<User>, token?: string) {
  return apiFetch(`/user/${userId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// DELETE /user/:uid
export function deleteUserByID(userId: string, token?: string) {
  return apiFetch(`/user/${userId}`, token, { method: 'DELETE' });
}

// PATCH /user/:uid/device-token
export function updateDeviceToken(userId: string, token: string, deviceToken: string) {
  return apiFetch(`/user/${userId}/device-token`, token, {
    method: 'PATCH',
    body: JSON.stringify({ token: deviceToken }),
  });
}

// GET /driver/:uid
export function getDriver(uid: string, token?: string) {
  return apiFetch(`/driver/${uid}`, token, { method: 'GET' });
}
