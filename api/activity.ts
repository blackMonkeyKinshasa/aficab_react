import { apiFetch } from './apiConfig';

// GET /activity?userId=xxx&isRead=xxx
export function getActivity(
  params?: { userId?: string; isRead?: boolean; action?: string; bookingId?: string },
  token?: string
) {
  const query = new URLSearchParams();
  if (params?.userId) query.append('userId', params.userId);
  if (params?.isRead !== undefined) query.append('isRead', String(params.isRead));
  if (params?.action) query.append('action', params.action);
  if (params?.bookingId) query.append('bookingId', params.bookingId);
  const qs = query.toString();
  return apiFetch(`/activity${qs ? `?${qs}` : ''}`, token, { method: 'GET' });
}

// PATCH /activity  — marquer une notification comme lue
export function readNotification(id: string, token?: string) {
  return apiFetch('/activity', token, {
    method: 'PATCH',
    body: JSON.stringify({ id }),
  });
}
