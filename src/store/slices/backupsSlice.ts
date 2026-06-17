import type { StateCreator } from "zustand";
import type { Backup, AppStore } from "../types";
import { apiAdapter } from "../apiAdapter";
import { t } from "../i18nHelper";

// ─── Slice Types ────────────────────────────────────────────────────────────

export type BackupsSlice = {
  backups: Backup[];
  addBackup: (reason: string) => Promise<Backup>;
  deleteBackup: (id: string) => void;
  restoreBackup: (id: string) => Promise<void>;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createBackupsSlice: StateCreator<AppStore, [], [], BackupsSlice> = (set, get) => ({
  backups: [],

  addBackup: async (reason) => {
    let record: Backup;
    try {
      record = await apiAdapter.backupHostsFile(reason);
    } catch (err) {
      console.error("Backup failed:", err);
      throw err;
    }

    set((state) => {
      let next = [record, ...state.backups];
      const { autoCleanupBackups, keepBackupsCount } = get().settings;
      if (autoCleanupBackups && keepBackupsCount > 0) {
        if (next.length > keepBackupsCount) {
          const itemsToPrune = next.slice(keepBackupsCount);
          for (const item of itemsToPrune) {
            apiAdapter.deleteBackupFile(item.id).catch((e) =>
              console.error("Failed to delete pruned backup file:", e)
            );
          }
          next = next.slice(0, keepBackupsCount);
        }
      }
      return { backups: next };
    });

    get().addNotification(
      t(get, "notif.backupCreatedTitle"),
      t(get, "notif.backupCreatedDesc", { reason }),
      "success"
    );
    return record;
  },

  deleteBackup: async (id) => {
    try {
      await apiAdapter.deleteBackupFile(id);
    } catch (err) {
      console.error("Failed to delete backup file physically:", err);
    }
    set((state) => ({
      backups: state.backups.filter((b) => b.id !== id),
    }));
  },

  restoreBackup: async (id) => {
    const reason = get().backups.find((b) => b.id === id)?.reason || "Unknown";
    await apiAdapter.restoreBackup(id);
    get().addNotification(
      t(get, "notif.backupRestoredTitle"),
      t(get, "notif.backupRestoredDesc", { reason }),
      "success"
    );
  },
});
