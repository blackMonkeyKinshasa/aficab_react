import { apiAuthFetch } from './apiConfig';

export type UploadAvatarResponse = {
  url: string;
};

// POST /upload/avatar  (multipart/form-data)
export function uploadAvatar(avatarData: FormData): Promise<UploadAvatarResponse> {
  return apiAuthFetch<UploadAvatarResponse>('/upload/avatar', {
    method: 'POST',
    body: avatarData,
  });
}
