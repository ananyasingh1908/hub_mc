import { create } from "zustand";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

type NotificationState = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ notifications: data.notifications ?? [] });
    } catch {
      // silent fail
    } finally {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ unreadCount: data.unreadCount ?? 0 });
    } catch {
      // silent fail
    }
  },

  markRead: async (id: string) => {
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { notifications, unreadCount } = get();
      set({
        notifications: notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
        unreadCount: Math.max(0, unreadCount - 1),
      });
    } catch {
      // silent fail
    }
  },

  markAllRead: async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({
        notifications: get().notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      });
    } catch {
      // silent fail
    }
  },
}));
