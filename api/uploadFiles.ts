import { apiAuthFetch } from './apiConfig';

// POST /upload/avatar  (multipart/form-data)
export function uploadAvatar(avatarData: FormData) {
  return apiAuthFetch('/upload/avatar', {
    method: 'POST',
    body: avatarData,
  });
}
