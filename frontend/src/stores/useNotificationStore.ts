import { create } from 'zustand';
import { apiClient as api } from '../api/axios';

export interface Notification {
    id: number;
    type: 'GROUP_JOIN' | 'PORTFOLIO_SHARE' | 'REACTION' | 'SYSTEM';
    content: string;
    targetId: string;
    isRead: boolean;
    senderNickname: string;
    createdAt: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,

    fetchNotifications: async () => {
        try {
            const response = await api.get('/notifications');
            if (response.data && response.data.data) {
                const notifications = response.data.data;
                // 실제 목록 기반으로 읽지 않은 개수 동기화
                const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
                set({ notifications, unreadCount });
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    },

    fetchUnreadCount: async () => {
        try {
            const response = await api.get('/notifications/unread-count');
            if (response.data && response.data.data !== undefined) {
                set({ unreadCount: response.data.data });
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    },

    markAsRead: async (id: number) => {
        const { notifications, unreadCount } = get();
        const target = notifications.find(n => n.id === id);
        
        // 이미 읽었거나 대상이 없으면 중단
        if (!target || target.isRead) return;

        try {
            // UI 먼저 즉시 반영 (Optimistic Update)
            set({
                notifications: notifications.map((n) =>
                    n.id === id ? { ...n, isRead: true } : n
                ),
                unreadCount: Math.max(0, unreadCount - 1),
            });
            
            // 서버 반영
            await api.patch(`/notifications/${id}/read`);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            // 에러 시 롤백 로직은 필요에 따라 추가
        }
    },

    markAllAsRead: async () => {
        try {
            await api.patch('/notifications/read-all');
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                unreadCount: 0,
            }));
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    },

    addNotification: (notification: Notification) => {
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));
    },
}));
