import { apiClient, unwrap } from '@/api/client';
import type { Notification } from '@/types/api';

export async function getUnreadNotificationCount() {
  return unwrap<number>(apiClient.get('/notifications/unread-count'));
}

export async function getNotifications() {
  return unwrap<Notification[]>(apiClient.get('/notifications'));
}

export async function markNotificationAsRead(id: number) {
  return unwrap<void>(apiClient.patch(`/notifications/${id}/read`));
}

export async function markAllNotificationsAsRead() {
  return unwrap<void>(apiClient.patch('/notifications/read-all'));
}
