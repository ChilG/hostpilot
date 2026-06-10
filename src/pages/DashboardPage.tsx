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
import {
  Globe,
  BookMarked,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  Circle,
  Plug,
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
  } = useAppStore();

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
      // 1. Create backup first
      await addBackup(`Auto-backup before quick apply (profile: ${activeProfile.name})`);

      // 2. Filter entries associated with the active profile
      const profileEntries = hosts.filter((h) =>
        activeProfile.entryIds?.includes(h.id)
      );

      // 3. Write hosts block via Tauri command
      if (isTauri) {
        await invoke("write_hosts_block", {
          blockName: activeProfile.name,
          entries: profileEntries,
        });
      }

      toast.success("Successfully applied to hosts file!", {
        description: `Active profile "${activeProfile.name}" hosts synced, and hosts file backed up.`,
      });
    } catch (e) {
      console.error("Failed to apply configuration:", e);
      toast.error("Elevation or Apply failed", {
        description: String(e),
      });
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



  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Dashboard"
        subtitle="Overview of your local environment"
        actions={
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
            onClick={() => setQuickApplyConfirmOpen(true)}
            disabled={!activeProfile || activeProfile.name === "None"}
          >
            <Zap className="w-3.5 h-3.5" />
            Quick Apply
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatusCard
            icon={<BookMarked className="w-4 h-4 text-indigo-400" />}
            label="Active Profile"
            value={activeProfile.name}
            badge={<Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5 py-0.5">Active</Badge>}
          />
          <StatusCard
            icon={<Globe className="w-4 h-4 text-sky-400" />}
            label="Enabled Hosts"
            value={`${enabledHosts.length} / ${hosts.length}`}
            badge={<Badge className="bg-sky-500/15 text-sky-400 border-0 text-[10px] px-1.5 py-0.5">Synced</Badge>}
          />
          <StatusCard
            icon={<Plug className="w-4 h-4 text-amber-400" />}
            label="Running Ports"
            value={`${runningPorts.length} / ${ports.length}`}
            badge={<Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] px-1.5 py-0.5">Live</Badge>}
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Profiles */}
          <div className="col-span-2 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Profiles</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                View all
              </Button>
            </div>
            <div className="divide-y divide-border">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition-colors group">
                  <div className="flex items-center gap-3">
                    {profile.active ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!profile.active && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleActivateProfile(profile.id, profile.name)}
                      >
                        <Zap className="w-3 h-3" />
                        Activate
                      </Button>
                    )}
                    {profile.active && (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">Active</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System status */}
          <div className="space-y-4">
            {/* Hosts file status */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">Hosts File</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Path</span>
                  <span className="font-mono text-foreground/80">
                    {isTauri ? (navigator.userAgent.includes("Windows") ? "C:\\...\\etc\\hosts" : "/etc/hosts") : "/etc/hosts"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5">Synced</Badge>
                </div>
              </div>
            </div>

            {/* Last backup */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium">Last Backup</span>
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
                  <p className="text-xs text-muted-foreground">No backups found.</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={!lastBackup}
                onClick={() => setRestoreConfirmOpen(true)}
              >
                Restore
              </Button>
            </div>


          </div>
        </div>

        {/* Live Diff Preview */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-medium">Hosts File Changes Preview (Diff)</span>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">Live</Badge>
          </div>
          <div className="p-5">
            {diff ? (
              <pre className="text-xs font-mono bg-muted/40 rounded-lg p-4 leading-6 max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {diff.split("\n").map((line, idx) => {
                  let color = "text-muted-foreground/60";
                  if (line.startsWith("+")) {
                    color = "text-emerald-400 bg-emerald-500/5";
                  } else if (line.startsWith("-")) {
                    color = "text-rose-400 bg-rose-500/5 font-medium";
                  }
                  return (
                    <div key={idx} className={`${color} px-2 py-0.5 rounded-sm`}>
                      {line}
                    </div>
                  );
                })}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                No changes to display. Select a profile or enable hosts.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Apply Confirmation Dialog */}
      <AlertDialog open={quickApplyConfirmOpen} onOpenChange={setQuickApplyConfirmOpen}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply active profile configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will write the hosts configuration for the active profile "{activeProfile.name}" to your local hosts file. 
              {isTauri && " You will be prompted by the system for administrator permissions to apply changes."}
              An automatic backup of your current setup will be generated before writing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuickApply} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Backup Confirmation Dialog */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore last backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore the system configuration from the backup created on {lastBackup ? new Date(lastBackup.createdAt).toLocaleString() : ""}? 
              This will overwrite your current configuration. You may be prompted for administrator credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Restore
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
