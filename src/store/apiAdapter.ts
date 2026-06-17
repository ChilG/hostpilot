import { invoke } from "@tauri-apps/api/core";
import { isTauri, type Backup } from "./types";

let _counter = 1000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

export const apiAdapter = {
  async loadAppConfig(): Promise<any> {
    if (isTauri) {
      return await invoke<any>("load_app_config");
    }
    const saved = localStorage.getItem("hostpilot_config");
    return saved ? JSON.parse(saved) : null;
  },

  async saveAppConfig(config: any): Promise<void> {
    if (isTauri) {
      await invoke("save_app_config", { config });
    } else {
      localStorage.setItem("hostpilot_config", JSON.stringify(config));
    }
  },

  async getProxyStatus(): Promise<number | null> {
    if (isTauri) {
      return await invoke<number | null>("get_proxy_status");
    }
    return null;
  },

  async checkCaStatus(): Promise<boolean> {
    if (isTauri) {
      return await invoke<boolean>("check_ca_status");
    }
    return false;
  },

  async getDefaultHostsPath(): Promise<string> {
    if (isTauri) {
      return await invoke<string>("get_default_hosts_path");
    }
    return "/etc/hosts";
  },

  async getDefaultBackupsPath(): Promise<string> {
    if (isTauri) {
      return await invoke<string>("get_default_backups_path");
    }
    return "~/.hostpilot/backups";
  },

  async getSystemLocale(): Promise<string> {
    if (isTauri) {
      return await invoke<string>("get_system_locale");
    }
    return typeof navigator !== "undefined" ? navigator.language : "en";
  },

  async checkPort(host: string, port: number): Promise<boolean> {
    if (isTauri) {
      return await invoke<boolean>("check_port", { host, port });
    }
    return Math.random() > 0.4;
  },

  async startProxyServer(port: number, sslEnabled: boolean, sslPort: number): Promise<void> {
    if (isTauri) {
      await invoke("start_proxy_server", {
        port,
        sslEnabled,
        sslPort,
      });
    }
  },

  async stopProxyServer(): Promise<void> {
    if (isTauri) {
      await invoke("stop_proxy_server");
    }
  },

  async installRootCa(): Promise<void> {
    if (isTauri) {
      await invoke("install_root_ca");
    }
  },

  async backupHostsFile(reason: string): Promise<Backup> {
    if (isTauri) {
      return await invoke<Backup>("backup_hosts_file", { reason });
    }
    const sizes = ["2.1 KB", "2.2 KB", "2.0 KB", "1.9 KB"];
    return {
      id: uid(),
      createdAt: now(),
      reason,
      size: sizes[Math.floor(Math.random() * sizes.length)],
    };
  },

  async deleteBackupFile(backupId: string): Promise<void> {
    if (isTauri) {
      await invoke("delete_backup_file", { backupId });
    }
  },

  async restoreBackup(backupId: string): Promise<void> {
    if (isTauri) {
      await invoke("restore_backup", { backupId });
    }
  },
};
