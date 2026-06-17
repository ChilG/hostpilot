import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import {
  isTauri,
  defaultSettings,
  initialHosts,
  initialGroups,
  initialProfiles,
  initialPorts,
  initialBackups,
  type AppNotification,
  type ProxyRule,
  type AppSettings,
  type AppStore,
  type HostEntry,
  type HostGroup,
  type HostProfile,
  type PortRule,
  type Backup,
} from "./types";
import { apiAdapter } from "./apiAdapter";
import { applyThemeClass, applyLanguageClass } from "./helpers/themeHelper";

// Import slice creators
import { createNotificationsSlice } from "./slices/notificationsSlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { createHostsSlice } from "./slices/hostsSlice";
import { createGroupsSlice } from "./slices/groupsSlice";
import { createProfilesSlice } from "./slices/profilesSlice";
import { createPortsSlice } from "./slices/portsSlice";
import { createProxySlice } from "./slices/proxySlice";
import { createBackupsSlice } from "./slices/backupsSlice";
import { createImportSlice } from "./slices/importSlice";

// Re-export types and settings to maintain API backward compatibility
export { isTauri, defaultSettings };
export type { AppNotification, ProxyRule, AppSettings, AppStore, HostEntry, HostGroup, HostProfile, PortRule, Backup };

// Combined Zustand store
export const useAppStore = create<AppStore>()((...a) => ({
  ...createNotificationsSlice(...a),
  ...createSettingsSlice(...a),
  ...createHostsSlice(...a),
  ...createGroupsSlice(...a),
  ...createProfilesSlice(...a),
  ...createPortsSlice(...a),
  ...createProxySlice(...a),
  ...createBackupsSlice(...a),
  ...createImportSlice(...a),
}));

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const loading = useAppStore((state) => state.loading);
  const settings = useAppStore((state) => state.settings);

  // Hydrate store on mount
  useEffect(() => {
    async function initStore() {
      try {
        const config = await apiAdapter.loadAppConfig();
        if (config) {
          useAppStore.setState({
            hosts: config.hosts || [],
            groups: config.groups || [],
            profiles: config.profiles || [],
            ports: config.ports || [],
            backups: config.backups || [],
            onboarded: config.onboarded || false,
            notifications: config.notifications || [],
            proxyRules: config.proxyRules || [],
          });

          if (isTauri) {
            try {
              const runningPort = await apiAdapter.getProxyStatus();
              useAppStore.setState({ proxyRunningPort: runningPort });
            } catch (e) {
              console.error("Failed to load proxy status on init:", e);
            }

            try {
              const trusted = await apiAdapter.checkCaStatus();
              useAppStore.setState({ caTrusted: trusted });
            } catch (e) {
              console.error("Failed to load CA status on init:", e);
            }
          }

          let initialSettings = config.settings || defaultSettings;
          if (isTauri) {
            try {
              const defaultPath = await apiAdapter.getDefaultHostsPath();
              initialSettings = { ...initialSettings, hostsPath: defaultPath };
            } catch (e) {
              console.error("Failed to load default hosts path:", e);
            }
            try {
              const defaultBackupPath = await apiAdapter.getDefaultBackupsPath();
              if (!initialSettings.backupDirectory || initialSettings.backupDirectory === "~/.hostpilot/backups") {
                initialSettings = { ...initialSettings, backupDirectory: defaultBackupPath };
              }
            } catch (e) {
              console.error("Failed to load default backups path:", e);
            }
          }
          useAppStore.setState({ settings: initialSettings });
        } else {
          // Seed defaults first time
          let initialSettings = defaultSettings;
          let lang: "en" | "th" = "en";

          if (isTauri) {
            try {
              const sysLocale = await apiAdapter.getSystemLocale();
              if (sysLocale.toLowerCase().startsWith("th")) {
                initialSettings = { ...initialSettings, language: "th" };
                lang = "th";
              }
            } catch (err) {
              console.error("Failed to detect system locale:", err);
            }
            try {
              const defaultPath = await apiAdapter.getDefaultHostsPath();
              initialSettings = { ...initialSettings, hostsPath: defaultPath };
            } catch (e) {
              console.error("Failed to load default hosts path:", e);
            }
            try {
              const defaultBackupPath = await apiAdapter.getDefaultBackupsPath();
              initialSettings = { ...initialSettings, backupDirectory: defaultBackupPath };
            } catch (e) {
              console.error("Failed to load default backups path:", e);
            }
          } else {
            if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("th")) {
              initialSettings = { ...defaultSettings, language: "th" };
              lang = "th";
            }
          }

          const initialTitle = lang === "th" ? "ยินดีต้อนรับสู่ Host Pilot!" : "Welcome to Host Pilot!";
          const initialDesc = lang === "th" 
            ? "ติดตั้งโปรแกรมเรียบร้อยแล้ว พร้อมให้คุณจัดการโฮสต์และพอร์ตอย่างง่ายดาย" 
            : "App successfully installed. Ready to manage hosts and ports.";

          useAppStore.setState({
            hosts: initialHosts,
            groups: initialGroups,
            profiles: initialProfiles,
            ports: initialPorts,
            backups: initialBackups,
            onboarded: false,
            notifications: [
              {
                id: "init_notif",
                title: initialTitle,
                description: initialDesc,
                type: "success",
                timestamp: new Date().toISOString(),
                unread: true,
              }
            ],
            settings: initialSettings,
          });
        }
      } catch (err) {
        console.error("Failed to load configuration:", err);
      } finally {
        useAppStore.setState({ loading: false });
      }
    }
    initStore();
  }, []);

  // Autosave when changes occur
  useEffect(() => {
    if (loading) return;

    let prevConfig = {
      hosts: useAppStore.getState().hosts,
      groups: useAppStore.getState().groups,
      profiles: useAppStore.getState().profiles,
      ports: useAppStore.getState().ports,
      backups: useAppStore.getState().backups,
      onboarded: useAppStore.getState().onboarded,
      settings: useAppStore.getState().settings,
      notifications: useAppStore.getState().notifications,
      proxyRules: useAppStore.getState().proxyRules,
    };

    const unsubscribe = useAppStore.subscribe((state) => {
      const hasChanged =
        state.hosts !== prevConfig.hosts ||
        state.groups !== prevConfig.groups ||
        state.profiles !== prevConfig.profiles ||
        state.ports !== prevConfig.ports ||
        state.backups !== prevConfig.backups ||
        state.onboarded !== prevConfig.onboarded ||
        state.settings !== prevConfig.settings ||
        state.notifications !== prevConfig.notifications ||
        state.proxyRules !== prevConfig.proxyRules;

      if (hasChanged) {
        prevConfig = {
          hosts: state.hosts,
          groups: state.groups,
          profiles: state.profiles,
          ports: state.ports,
          backups: state.backups,
          onboarded: state.onboarded,
          settings: state.settings,
          notifications: state.notifications,
          proxyRules: state.proxyRules,
        };
        apiAdapter.saveAppConfig(prevConfig).catch((err) => {
          console.error("Failed to save configuration:", err);
        });
      }
    });

    return unsubscribe;
  }, [loading]);

  // Set theme & language classes
  useEffect(() => {
    if (!loading) {
      applyThemeClass(settings.colorTheme);
      applyLanguageClass(settings.language);
    }
  }, [settings.colorTheme, settings.language, loading]);

  return <>{children}</>;
}
