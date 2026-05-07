import { apiFetch } from './apiConfig';

// POST /upload/avatar  (multipart/form-data)
export function uploadAvatar(avatarData: FormData) {
  return apiFetch('/upload/avatar', {
    method: 'POST',
    body: avatarData,
  });
}
