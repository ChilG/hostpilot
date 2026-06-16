import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck,
  Bell,
  Palette,
  Info,
  ChevronRight,
  Globe,
} from "lucide-react";

import { invoke } from "@tauri-apps/api/core";
import { useAppStore, isTauri } from "@/store/AppStore";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/translations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 pr-8">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, children }: SettingsSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="px-5 divide-y divide-border">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [appVersion, setAppVersion] = useState("v0.1.2");

  useEffect(() => {
    if (isTauri) {
      import("@tauri-apps/api/app")
        .then((app) => app.getVersion())
        .then((ver) => setAppVersion(`v${ver}`))
        .catch((err) => console.error("Failed to get app version:", err));
    }
  }, []);

  const handleCheckUpdates = async () => {
    if (!isTauri) {
      toast.info("Update check is only available in the desktop application.");
      return;
    }

    setChecking(true);
    const toastId = toast.loading("Checking for updates...");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      
      if (update && update.available) {
        toast.dismiss(toastId);
        
        toast.info(`Update v${update.version} is available!`, {
          description: "Downloading and installing update...",
          duration: 5000,
        });

        await update.downloadAndInstall();

        toast.success("Update installed! Relaunching application...", {
          duration: 3000,
        });

        setTimeout(async () => {
          try {
            await invoke("relaunch_app");
          } catch (err) {
            console.error("Failed to relaunch:", err);
          }
        }, 1500);

      } else {
        toast.dismiss(toastId);
        toast.success("You are running the latest version!");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      toast.dismiss(toastId);
      toast.error("Failed to check for updates.");
    } finally {
      setChecking(false);
    }
  };

  const handleBrowseBackupDir = async () => {
    try {
      const selected = await invoke<string | null>("select_backup_directory");
      if (selected) {
        updateSettings({ backupDirectory: selected });
      }
    } catch (e) {
      console.error("Failed to select backup directory:", e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title={t("settings")} subtitle={t("settingsSubtitle")} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Hosts File */}
        <SettingsSection
          icon={<Globe className="w-4 h-4 text-sky-400" />}
          title={t("hostsFileSettings")}
        >
          <SettingRow
            label={t("hostsFilePath")}
            description={t("hostsFilePathDesc")}
          >
            <div className="flex items-center gap-2">
              <Input
                value={settings.hostsPath}
                readOnly
                className="h-8 text-xs w-48 font-mono bg-muted/30"
              />
            </div>
          </SettingRow>
          <SettingRow
            label={t("previewBeforeApply")}
            description={t("previewBeforeApplyDesc")}
          >
            <Switch
              checked={settings.previewBeforeApply}
              onCheckedChange={(checked) =>
                updateSettings({ previewBeforeApply: checked })
              }
            />
          </SettingRow>
          <SettingRow
            label={t("backupBeforeWrite")}
            description={t("backupBeforeWriteDesc")}
          >
            <Switch
              checked={settings.backupBeforeWrite}
              onCheckedChange={(checked) =>
                updateSettings({ backupBeforeWrite: checked })
              }
            />
          </SettingRow>
          <SettingRow
            label={t("validateBeforeWrite")}
            description={t("validateBeforeWriteDesc")}
          >
            <Switch
              checked={settings.validateBeforeWrite}
              onCheckedChange={(checked) =>
                updateSettings({ validateBeforeWrite: checked })
              }
            />
          </SettingRow>
        </SettingsSection>

        {/* Backups */}
        <SettingsSection
          icon={<ShieldCheck className="w-4 h-4 text-violet-400" />}
          title={t("backupSettings")}
        >
          <SettingRow
            label={t("backupDirectory")}
            description={t("backupDirectoryDesc")}
          >
            <div className="flex items-center gap-2">
              <Input
                value={settings.backupDirectory}
                onChange={(e) =>
                  updateSettings({ backupDirectory: e.target.value })
                }
                className="h-8 text-xs w-48 font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleBrowseBackupDir}
              >
                {t("browse")}
              </Button>
            </div>
          </SettingRow>
          <SettingRow
            label={t("keepBackups")}
            description={t("keepBackupsDesc")}
          >
            <Input
              value={settings.keepBackupsCount}
              onChange={(e) =>
                updateSettings({
                  keepBackupsCount: parseInt(e.target.value) || 0,
                })
              }
              className="h-8 text-xs w-20 text-center"
              type="number"
            />
          </SettingRow>
          <SettingRow
            label={t("autoCleanup")}
            description={t("autoCleanupDesc")}
          >
            <Switch
              checked={settings.autoCleanupBackups}
              onCheckedChange={(checked) =>
                updateSettings({ autoCleanupBackups: checked })
              }
            />
          </SettingRow>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          icon={<Bell className="w-4 h-4 text-amber-400" />}
          title={t("notificationSettings")}
        >
          <SettingRow
            label={t("showApplyNotifications")}
            description={t("showApplyNotificationsDesc")}
          >
            <Switch
              checked={settings.showApplyNotifications}
              onCheckedChange={(checked) =>
                updateSettings({ showApplyNotifications: checked })
              }
            />
          </SettingRow>
          <SettingRow
            label={t("showErrorAlerts")}
            description={t("showErrorAlertsDesc")}
          >
            <Switch
              checked={settings.showErrorAlerts}
              onCheckedChange={(checked) =>
                updateSettings({ showErrorAlerts: checked })
              }
            />
          </SettingRow>
          <SettingRow
            label={t("portStatusAlerts")}
            description={t("portStatusAlertsDesc")}
          >
            <Switch
              checked={settings.portStatusAlerts}
              onCheckedChange={(checked) =>
                updateSettings({ portStatusAlerts: checked })
              }
            />
          </SettingRow>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={<Palette className="w-4 h-4 text-indigo-400" />}
          title={t("appearanceSettings")}
        >
          <SettingRow
            label={t("colorTheme")}
            description={t("colorThemeDesc")}
          >
            <div className="flex gap-1.5">
              {["dark", "light", "system"].map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ colorTheme: theme as any })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    settings.colorTheme === theme
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t(theme + "Theme")}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow
            label={t("languageSetting")}
            description={t("languageSettingDesc")}
          >
            <Select
              value={settings.language}
              onValueChange={(val) =>
                updateSettings({ language: val as any })
              }
            >
              <SelectTrigger className="h-8 text-xs w-32 bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="th">ไทย</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingsSection>

        {/* About */}
        <SettingsSection
          icon={<Info className="w-4 h-4 text-muted-foreground" />}
          title={t("aboutSettings")}
        >
          <SettingRow label={t("appVersion")} description="Current app version">
            <Badge className="bg-muted text-muted-foreground border-0 font-mono text-xs">
              {appVersion}
            </Badge>
          </SettingRow>
          <SettingRow
            label={t("checkUpdates")}
            description={t("lastCheckedToday")}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCheckUpdates}
              disabled={checking}
            >
              {checking ? "Checking..." : t("checkNow")}
            </Button>
          </SettingRow>
          <div className="py-4">
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {t("openSourceLicenses")}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
