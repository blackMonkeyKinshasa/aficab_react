import { User } from '@/constants/dataInterface';
import { apiAuthFetch } from './apiConfig';

// GET /user/:uid
export function getUserByID(userId: string) {
  return apiAuthFetch(`/user/${userId}`, { method: 'GET' });
}

// PATCH /user/:uid
export function updateUserByID(userId: string, updates: Partial<User>) {
  return apiAuthFetch(`/user/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// DELETE /user/:uid
export function deleteUserByID(userId: string) {
  return apiAuthFetch(`/user/${userId}`, { method: 'DELETE' });
}

// PATCH /user/:uid/device-token
export function updateDeviceToken(userId: string, deviceToken: string) {
  return apiAuthFetch(`/user/${userId}/device-token`, {
    method: 'PATCH',
    body: JSON.stringify({ token: deviceToken }),
  });
}

// GET /driver/:uid
export function getDriver(uid: string) {
  return apiAuthFetch(`/driver/${uid}`, { method: 'GET' });
}
