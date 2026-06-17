import type { StateCreator } from "zustand";
import type { AppNotification, AppStore } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 1000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type NotificationsSlice = {
  notifications: AppNotification[];
  addNotification: (title: string, description: string, type?: "info" | "success" | "warning" | "error") => void;
  clearNotifications: () => void;
  markAllNotificationsAsRead: () => void;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createNotificationsSlice: StateCreator<AppStore, [], [], NotificationsSlice> = (set) => ({
  notifications: [],

  addNotification: (
    title: string,
    description: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) => {
    set((state) => {
      const newNotif: AppNotification = {
        id: uid(),
        title,
        description,
        type,
        timestamp: now(),
        unread: true,
      };
      return { notifications: [newNotif, ...state.notifications].slice(0, 50) };
    });
  },

  clearNotifications: () => set({ notifications: [] }),

  markAllNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.unread ? { ...n, unread: false } : n
      ),
    }));
  },
});
