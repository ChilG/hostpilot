import { useState, useEffect } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { Topbar } from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/badge";
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
import {
  Globe,
  BookMarked,
  ShieldCheck,
  Zap,
  Clock,
  Plug,
  ExternalLink,
} from "lucide-react";

export function DashboardPage() {
  const {
    hosts,
    profiles,
    ports,
    backups,
    activateProfile,
    addBackup,
    restoreBackup,
    settings,
  } = useAppStore();
  const { t } = useTranslation();

  const [quickApplyConfirmOpen, setQuickApplyConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [diff, setDiff] = useState<string>("");

  const activeProfile = profiles.find((p) => p.active) || profiles[0] || { name: "None", id: "", entryIds: [] };
  const enabledHosts = hosts.filter((h) => h.enabled);
  const lastBackup = backups[0];
  const runningPorts = ports.filter((p) => p.status === "running");

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
        setDiff(`Error loading hosts diff: ${err}`);
      }
    }
    loadDiff();
  }, [hosts, activeProfile]);

  const handleQuickApply = async () => {
    try {
      // 2. Filter entries associated with the active profile
      const profileEntries = hosts.filter((h) =>
        activeProfile.entryIds?.includes(h.id)
      );

      // Validate before write if enabled
      if (settings.validateBeforeWrite) {
        const ipRegex = /^[0-9a-fA-F.:%]+$/;
        const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9.]*$/;
        for (const entry of profileEntries) {
          if (entry.enabled) {
            const ip = entry.ip.trim();
            const domain = entry.domain.trim();
            if (!ip) {
              throw new Error(`IP address cannot be empty for domain "${domain}"`);
            }
            if (!domain) {
              throw new Error("Domain name cannot be empty");
            }
            if (!ipRegex.test(ip)) {
              throw new Error(`Invalid IP address format: "${ip}"`);
            }
            if (!domainRegex.test(domain)) {
              throw new Error(`Invalid domain name format: "${domain}"`);
            }
          }
        }
      }

      // 1. Create backup first if enabled
      if (settings.backupBeforeWrite) {
        await addBackup(`Auto-backup before quick apply (profile: ${activeProfile.name})`);
      }

      // 3. Write hosts block via Tauri command
      if (isTauri) {
        await invoke("write_hosts_block", {
          blockName: activeProfile.name,
          entries: profileEntries,
        });
      }

      if (settings.showApplyNotifications) {
        toast.success("Successfully applied to hosts file!", {
          description: `Active profile "${activeProfile.name}" hosts synced.`,
        });
      }
    } catch (e) {
      console.error("Failed to apply configuration:", e);
      if (settings.showErrorAlerts) {
        toast.error("Elevation or Apply failed", {
          description: String(e),
        });
      }
    } finally {
      setQuickApplyConfirmOpen(false);
    }
  };

  const handleRestore = async () => {
    if (!lastBackup) return;
    try {
      await restoreBackup(lastBackup.id);
      toast.success("Restore completed successfully!", {
        description: `Hosts file restored to backup from ${new Date(lastBackup.createdAt).toLocaleString()}`,
      });
    } catch (e) {
      console.error("Failed to restore backup:", e);
      toast.error("Failed to restore backup", {
        description: String(e),
      });
    } finally {
      setRestoreConfirmOpen(false);
    }
  };

  const handleActivateProfile = (profileId: string, name: string) => {
    activateProfile(profileId);
    toast.success(`Profile "${name}" activated`);
  };

  const handleOpenPort = async (port: any) => {
    const url = `${port.protocol}://${port.targetHost}:${port.port}`;
    toast.info(`Opening ${url}`, { description: `→ ${port.domain}` });
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
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
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatusCard
            icon={<BookMarked className="w-4 h-4 text-indigo-400" />}
            label={t("activeProfile")}
            value={activeProfile.name}
            badge={
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5 py-0.5 animate-fade-in">
                {t("active")}
              </Badge>
            }
          />
          <StatusCard
            icon={<Globe className="w-4 h-4 text-sky-400" />}
            label={t("hosts")}
            value={`${enabledHosts.length} / ${hosts.length}`}
            badge={
              <Badge className="bg-sky-500/15 text-sky-400 border-0 text-[10px] px-1.5 py-0.5">
                {t("active")}
              </Badge>
            }
          />
          <StatusCard
            icon={<Plug className="w-4 h-4 text-amber-400" />}
            label={t("ports")}
            value={`${runningPorts.length} / ${ports.length}`}
            badge={
              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] px-1.5 py-0.5">
                Live
              </Badge>
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Port Rules */}
          <div className="col-span-2 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("ports")}</span>
              </div>
              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] px-1.5 py-0.5">
                {runningPorts.length} {t("active")}
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {ports.map((port) => (
                <div
                  key={port.id}
                  onClick={() => handleOpenPort(port)}
                  className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      port.status === "running" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-medium">{port.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {port.protocol}://{port.targetHost}:{port.port}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`border-0 text-[10px] ${
                        port.status === "running"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {port.status === "running" ? t("running") : t("stopped")}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPort(port);
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t("openInBrowser")}
                    </Button>
                  </div>
                </div>
              ))}
              {ports.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">{t("noData")}</p>
              )}
            </div>
          </div>

          {/* System status */}
          <div className="space-y-4">
            {/* Hosts file status */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">{t("hostsFileSettings")}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("hostsFilePath")}</span>
                  <span className="font-mono text-foreground/80 truncate max-w-[120px]">
                    {isTauri ? (navigator.userAgent.includes("Windows") ? "C:\\...\\etc\\hosts" : "/etc/hosts") : "/etc/hosts"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("status")}</span>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5">{t("active")}</Badge>
                </div>
              </div>
            </div>

            {/* Last backup */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium">{t("backups")}</span>
                </div>
              </div>
              <div className="space-y-2">
                {lastBackup ? (
                  <>
                    <p className="text-xs text-muted-foreground truncate">{lastBackup.reason}</p>
                    <p className="text-xs font-mono text-foreground/60">
                      {new Date(lastBackup.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{lastBackup.size}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("noData")}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={!lastBackup}
                onClick={() => setRestoreConfirmOpen(true)}
              >
                {t("restore")}
              </Button>
            </div>

            {/* Recent Profiles */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium">{t("recentProfiles")}</span>
                </div>
              </div>
              <div className="space-y-2">
                {profiles.slice(0, 3).map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-medium truncate">{profile.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{profile.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {profile.active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">{t("active")}</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
                          onClick={() => handleActivateProfile(profile.id, profile.name)}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          {t("confirm")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {profiles.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">{t("noData")}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Diff Preview */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-medium">{t("hostsFilePreview")}</span>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">Live</Badge>
          </div>
          <div className="p-5">
            {diff ? (
              <pre className="text-xs font-mono bg-muted/40 rounded-lg p-4 leading-6 max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {diff.split("\n").map((line, idx) => {
                  let color = "text-muted-foreground/60";
                  let displayLine = line;
                  if (line.startsWith("+")) {
                    color = "text-emerald-400 bg-emerald-500/5";
                    const content = line.slice(1);
                    displayLine = content.trim() === "" ? "+" : `+ ${content}`;
                  } else if (line.startsWith("-")) {
                    color = "text-rose-400 bg-rose-500/5 font-medium";
                    const content = line.slice(1);
                    displayLine = content.trim() === "" ? "-" : `- ${content}`;
                  } else if (line.startsWith(" ")) {
                    const content = line.slice(1);
                    displayLine = content.trim() === "" ? " " : `  ${content}`;
                  }
                  return (
                    <div key={idx} className={`${color} px-2 py-0.5 rounded-sm`}>
                      {displayLine}
                    </div>
                  );
                })}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                {t("noData")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Apply Confirmation Dialog */}
      <AlertDialog open={quickApplyConfirmOpen} onOpenChange={setQuickApplyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("applyConfirmation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("applyConfirmText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuickApply} className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
            <AlertDialogDescription>
              {t("restoreBackupText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center">
          {icon}
        </div>
        {badge}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}
