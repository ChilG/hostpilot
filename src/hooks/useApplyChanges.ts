import { useState, useMemo } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { isTauri, getProfileHosts } from "@/store/types";

/**
 * Custom hook that handles applying hosts configuration changes.
 * Encapsulates validation, backups, and writing to the hosts file.
 */
export function useApplyChanges() {
  const { t } = useTranslation();
  const { hosts, profiles, settings, addBackup } = useAppStore();
  const [quickApplyConfirmOpen, setQuickApplyConfirmOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.active);
  }, [profiles]);

  const handleQuickApply = async () => {
    if (!activeProfile) return;
    try {
      // Filter entries associated with the active profile
      const profileEntries = getProfileHosts(activeProfile, hosts);

      // Validate before write if enabled
      if (settings.validateBeforeWrite) {
        const ipRegex = /^[0-9a-fA-F.:%]+$/;
        const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9.]*$/;
        for (const entry of profileEntries) {
          if (entry.enabled) {
            const ip = entry.ip.trim();
            const domain = entry.domain.trim();
            if (!ip) {
              throw new Error(t("ipCannotBeEmpty", { domain }));
            }
            if (!domain) {
              throw new Error(t("domainCannotBeEmpty"));
            }
            if (!ipRegex.test(ip)) {
              throw new Error(t("invalidIpFormat", { ip }));
            }
            if (!domainRegex.test(domain)) {
              throw new Error(t("invalidDomainFormat", { domain }));
            }
          }
        }
      }

      // Create backup first if enabled
      if (settings.backupBeforeWrite) {
        await addBackup(t("autoBackupBeforeApply", { name: activeProfile.name }));
      }

      // Write hosts block via Tauri command
      if (isTauri) {
        await invoke("write_hosts_block", {
          blockName: activeProfile.name,
          entries: profileEntries,
        });
      }

      setRefreshTrigger((prev) => prev + 1);

      // Dispatch event to reload diff preview in UI and trigger local reload
      window.dispatchEvent(new CustomEvent("hosts-file-updated"));

      if (settings.showApplyNotifications) {
        toast.success(t("applySuccess"), {
          description: t("applySuccessDetail", { name: activeProfile.name }),
        });
      }
    } catch (e) {
      console.error("Failed to apply configuration:", e);
      if (settings.showErrorAlerts) {
        toast.error(t("applyFailed"), {
          description: String(e),
        });
      }
    } finally {
      setQuickApplyConfirmOpen(false);
    }
  };

  return {
    quickApplyConfirmOpen,
    setQuickApplyConfirmOpen,
    refreshTrigger,
    setRefreshTrigger,
    handleQuickApply,
  };
}
