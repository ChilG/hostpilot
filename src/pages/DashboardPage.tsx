import { useState } from "react";
import { toast } from "sonner";
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
import { useAppStore } from "@/store/AppStore";
import {
  Globe,
  BookMarked,
  FolderOpen,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCw,
  Plug,
} from "lucide-react";

export function DashboardPage() {
  const {
    hosts,
    profiles,
    ports,
    projects,
    backups,
    activateProfile,
    activateProject,
    addBackup,
  } = useAppStore();

  const [quickApplyConfirmOpen, setQuickApplyConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  const activeProfile = profiles.find((p) => p.active) || profiles[0] || { name: "None", id: "" };
  const activeProject = projects.find((p) => p.active) || projects[0] || { name: "None", id: "" };
  const enabledHosts = hosts.filter((h) => h.enabled);
  const lastBackup = backups[0];
  const runningPorts = ports.filter((p) => p.status === "running");

  const handleQuickApply = () => {
    addBackup(`Auto-backup before quick apply (profile: ${activeProfile.name})`);
    toast.success("Successfully applied to hosts file!", {
      description: "Active profile hosts synced to /etc/hosts, and configuration backed up.",
    });
    setQuickApplyConfirmOpen(false);
  };

  const handleRestore = () => {
    if (!lastBackup) return;
    toast.success("Restore simulated", {
      description: `Hosts file restored to backup from ${new Date(lastBackup.createdAt).toLocaleString()}`,
    });
    setRestoreConfirmOpen(false);
  };

  const handleActivateProfile = (profileId: string, name: string) => {
    activateProfile(profileId);
    toast.success(`Profile "${name}" activated`);
  };

  const handleActivateProject = (projectId: string, name: string) => {
    activateProject(projectId);
    toast.success(`Switched project to "${name}"`);
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
          >
            <Zap className="w-3.5 h-3.5" />
            Quick Apply
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatusCard
            icon={<BookMarked className="w-4 h-4 text-indigo-400" />}
            label="Active Profile"
            value={activeProfile.name}
            badge={<Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5 py-0.5">Active</Badge>}
          />
          <StatusCard
            icon={<FolderOpen className="w-4 h-4 text-violet-400" />}
            label="Active Project"
            value={activeProject.name}
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
                  <span className="font-mono text-foreground/80">/etc/hosts</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Managed blocks</span>
                  <span className="font-medium text-foreground/80">1 block</span>
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
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {lastBackup ? (
                  <>
                    <p className="text-xs text-muted-foreground">{lastBackup.reason}</p>
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

            {/* Recent Projects */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <span className="text-sm font-medium">Recent Projects</span>
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => handleActivateProject(proj.id, proj.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/60 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {proj.active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {!proj.active && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
                    <span className="text-xs font-medium">{proj.name}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diff Preview */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-medium">Managed Hosts Block Preview</span>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">In sync</Badge>
          </div>
          <div className="p-5">
            <pre className="text-xs font-mono text-muted-foreground bg-muted/40 rounded-lg p-4 leading-6">
              <span className="text-muted-foreground/50">{`# >>> HostPilot START: demo-local\n`}</span>
              {enabledHosts.map((h) => (
                <span key={h.id} className="text-emerald-400">
                  {`127.0.0.1   ${h.domain}\n`}
                </span>
              ))}
              <span className="text-muted-foreground/50">{`# <<< HostPilot END: demo-local`}</span>
            </pre>
          </div>
        </div>
      </div>

      {/* Quick Apply Confirmation Dialog */}
      <AlertDialog open={quickApplyConfirmOpen} onOpenChange={setQuickApplyConfirmOpen}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply active profile configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will simulate writing the hosts configuration for the active profile "{activeProfile.name}" to your local hosts file (/etc/hosts). An automatic backup of your current setup will be generated.
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
              Are you sure you want to restore the system configuration from the backup created on {lastBackup ? new Date(lastBackup.createdAt).toLocaleString() : ""}? This will overwrite your current configuration.
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

