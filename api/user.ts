import { User } from '@/constants/dataType';
import { apiFetch } from './apiConfig'

// function GET

export function getUserByID( userId: string,token?: string,) {
      const endpoint = '/user/'+userId;
 return apiFetch(endpoint, token, {
    method: 'GET',
  });
}

// function patch

export function updateUserByID( userId: string, updates: User,token?: string,) {
      const endpoint = '/user/'+userId;
return apiFetch(endpoint, token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

//delete

export function deleteUserByID(token: string, userId: string) {
      const endpoint = '/user/'+userId;
  return apiFetch(endpoint, token, {
    method: 'DELETE',
  });
}
