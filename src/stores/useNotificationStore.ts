import { create } from 'zustand';

export interface ToastNotification {
  id: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'security';
  durationMs?: number;
  timestamp: number;
}

interface NotificationState {
  notifications: ToastNotification[];
  pushNotification: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  pushNotification: (n) => {
    const id = 'notif_' + Math.random().toString(36).substring(2, 9);
    const item: ToastNotification = {
      ...n,
      id,
      timestamp: Date.now(),
    };
    set((state) => ({ notifications: [...state.notifications, item] }));

    const duration = n.durationMs ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((t) => t.id !== id),
    })),
  clearAll: () => set({ notifications: [] }),
}));
