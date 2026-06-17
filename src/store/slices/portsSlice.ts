import type { StateCreator } from "zustand";
import { toast } from "sonner";
import type { PortRule, AppStore } from "../types";
import { apiAdapter } from "../apiAdapter";
import { t } from "../i18nHelper";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 5000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;

// ─── Slice Types ────────────────────────────────────────────────────────────

export type PortsSlice = {
  ports: PortRule[];
  addPort: (p: Omit<PortRule, "id">) => void;
  updatePort: (id: string, patch: Partial<PortRule>) => void;
  deletePort: (id: string) => void;
  checkPortLive: (id: string, host: string, port: number) => Promise<boolean>;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createPortsSlice: StateCreator<AppStore, [], [], PortsSlice> = (set, get) => ({
  ports: [],

  addPort: (p) => {
    set((state) => ({
      ports: [...state.ports, { ...p, id: uid() }],
    }));
  },

  updatePort: (id, patch) => {
    set((state) => ({
      ports: state.ports.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },

  deletePort: (id) => {
    set((state) => ({
      ports: state.ports.filter((p) => p.id !== id),
    }));
  },

  checkPortLive: async (id, host, port) => {
    let isOpen = false;
    try {
      isOpen = await apiAdapter.checkPort(host, port);
      set((state) => ({
        ports: state.ports.map((p) => {
          if (p.id === id) {
            const oldStatus = p.status;
            const newStatus = isOpen ? "running" : "stopped";
            if (oldStatus === "running" && newStatus === "stopped") {
              get().addNotification(
                t(get, "notif.portDownTitle"),
                t(get, "notif.portDownDesc", { domain: p.domain, port: p.port }),
                "error"
              );
              if (get().settings.portStatusAlerts) {
                toast.error(
                  t(get, "notif.portDownToastTitle", { domain: p.domain, port: p.port }),
                  {
                    description: t(get, "notif.portDownToastDesc", { host: p.targetHost }),
                  }
                );
              }
            }
            return { ...p, status: newStatus };
          }
          return p;
        }),
      }));
    } catch (e) {
      console.error("Failed to check port status:", e);
    }
    return isOpen;
  },
});
