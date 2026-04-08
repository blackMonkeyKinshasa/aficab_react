import { apiFetch } from './apiConfig';

// POST /upload/avatar  (multipart/form-data)
export function uploadAvatar(avatarData: FormData, token?: string) {
  return apiFetch('/upload/avatar', token, {
    method: 'POST',
    body: avatarData,
  });
}
