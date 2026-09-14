import { Driver, User } from '@/constants/dataInterface';

import { apiAuthFetch } from './apiConfig';

// GET /user/:uid
export function getUserByID(userId: string): Promise<User> {
  return apiAuthFetch<User>(`/user/${userId}`, { method: 'GET' });
}

// PATCH /user/:uid
export function updateUserByID(userId: string, updates: Partial<User>): Promise<User> {
  return apiAuthFetch<User>(`/user/${userId}`, {
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

// GET /user/:uid/device-token
export function getUserDeviceToken(userId: string) {
  return apiAuthFetch(`/user/${userId}/device-token`, { method: 'GET' });
}

// GET /driver/:uid
export function getDriver(uid: string): Promise<Driver> {
  return apiAuthFetch<Driver>(`/driver/${uid}`, { method: 'GET' });
}

export function getDriverByUserId(uid: string): Promise<Driver> {
  return getDriver(uid);
}

export function getDriverById(uid: string): Promise<Driver> {
  return getDriverByUserId(uid);
}
