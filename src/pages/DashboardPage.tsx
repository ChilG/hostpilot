import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { useApplyChanges } from "@/hooks/useApplyChanges";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore, isTauri } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { Zap } from "lucide-react";

import { StatusCardList } from "@/components/dashboard/StatusCardList";
import { RecentPortsList } from "@/components/dashboard/RecentPortsList";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { LiveDiffPreview } from "@/components/dashboard/LiveDiffPreview";

export function DashboardPage() {
  const {
    hosts,
    profiles,
    backups,
    activateProfile,
    restoreBackup,
    settings,
  } = useAppStore();
  const { t } = useTranslation();

  const {
    quickApplyConfirmOpen,
    setQuickApplyConfirmOpen,
    refreshTrigger,
    setRefreshTrigger,
    handleQuickApply,
  } = useApplyChanges();

  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [diff, setDiff] = useState<string>("");

  const hasPendingChanges = useMemo(() => {
    return diff.split("\n").some((line) => line.startsWith("+") || line.startsWith("-"));
  }, [diff]);

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.active) ||
      profiles[0] || { name: "None", id: "", entryIds: [] };
  }, [profiles]);

  // Listen for background hosts file updates to refresh diff preview
  useEffect(() => {
    const handleHostsUpdated = () => {
      setRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener("hosts-file-updated", handleHostsUpdated);
    return () => {
      window.removeEventListener("hosts-file-updated", handleHostsUpdated);
    };
  }, []);

  // Load live hosts diff
  useEffect(() => {
    async function loadDiff() {
      if (!activeProfile || !activeProfile.name || activeProfile.name === "None") {
        setDiff("");
        return;
      }
      try {
        const profileEntries = hosts.filter((h) =>
          activeProfile.entryIds?.includes(h.id)
        );
        if (isTauri) {
          const result = await invoke<string>("get_hosts_diff", {
            blockName: activeProfile.name,
            entries: profileEntries,
          });
          setDiff(result);
        } else {
          // Browser mock diff
          const mockLines = [
            `  # System hosts file mock preview`,
            `  127.0.0.1 localhost`,
            `- # >>> HostPilot START: old-block`,
            `- 127.0.0.1 old-domain.local`,
            `- # <<< HostPilot END: old-block`,
            `+ # >>> HostPilot START: ${activeProfile.name}`,
            ...profileEntries
              .filter((h) => h.enabled)
              .map((h) => `+ 127.0.0.1   ${h.domain}`),
            `+ # <<< HostPilot END: ${activeProfile.name}`,
          ];
          setDiff(mockLines.join("\n"));
        }
      } catch (err) {
        console.error("Failed to load diff:", err);
        setDiff(t("errorLoadingDiff", { error: String(err) }));
      }
    }
    loadDiff();
  }, [hosts, activeProfile, refreshTrigger]);


  const handleRestore = async () => {
    const lastBackup = backups[0];
    if (!lastBackup) return;
    try {
      await restoreBackup(lastBackup.id);
      setRefreshTrigger((prev) => prev + 1);
      toast.success(t("restoreSuccess"), {
        description: t("restoreSuccessDetail", {
          date: new Date(lastBackup.createdAt).toLocaleString(),
        }),
      });
    } catch (e) {
      console.error("Failed to restore backup:", e);
      toast.error(t("restoreFailed"), {
        description: String(e),
      });
    } finally {
      setRestoreConfirmOpen(false);
    }
  };

  const handleActivateProfile = (profileId: string, name: string) => {
    activateProfile(profileId);
    toast.success(t("profileActivated", { name }));
  };

  const handleOpenPort = async (port: any) => {
    const url = `${port.protocol}://${port.targetHost}:${port.port}`;
    toast.info(t("openingUrl", { url }), { description: t("toDomain", { domain: port.domain }) });
    try {
      if (isTauri) {
        await invoke("open_in_browser", { url });
      } else {
        window.open(url, "_blank");
      }
    } catch (e) {
      console.error("Failed to open browser URL:", e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("dashboard")}
        subtitle={t("dashboardSubtitle")}
        actions={
          <Button
            size="sm"
            className={`gap-1.5 h-8 text-xs relative overflow-hidden transition-all duration-300 ${
              hasPendingChanges
                ? "bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse-glow ring-1 ring-indigo-400/50"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
            onClick={() => {
              if (settings.previewBeforeApply) {
                setQuickApplyConfirmOpen(true);
              } else {
                handleQuickApply();
              }
            }}
            disabled={!activeProfile || activeProfile.name === "None"}
          >
            <Zap className="w-3.5 h-3.5" />
            {t("applyChanges")}
            {hasPendingChanges && (
              <span className="absolute top-0.5 right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
            )}
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <StatusCardList />

        <div className="grid grid-cols-3 gap-6">
          <RecentPortsList onOpenPort={handleOpenPort} />
          <DashboardSidebar
            onRestoreClick={() => setRestoreConfirmOpen(true)}
            onActivateProfile={handleActivateProfile}
          />
        </div>

        <LiveDiffPreview diff={diff} />
      </div>

      {/* Quick Apply Confirmation Dialog */}
      <AlertDialog open={quickApplyConfirmOpen} onOpenChange={setQuickApplyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("applyConfirmation")}</AlertDialogTitle>
            <AlertDialogDescription>{t("applyConfirmText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuickApply}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Backup Confirmation Dialog */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restoreBackupConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("restoreBackupText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
