import { useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useAppStore, type Backup } from "@/store/AppStore";
import { BackupCreateDialog } from "@/components/backups/BackupCreateDialog";
import { ShieldCheck, RotateCcw, Trash2, Download, Plus, Clock } from "lucide-react";

export function BackupsPage() {
  const { backups, deleteBackup } = useAppStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Backup | undefined>();
  const [restoreTarget, setRestoreTarget] = useState<Backup | undefined>();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteBackup(deleteTarget.id);
    toast.success("Backup deleted");
    setDeleteTarget(undefined);
  };

  const handleRestore = () => {
    if (!restoreTarget) return;
    toast.success("Restore simulated", {
      description: `Hosts file restored to backup from ${new Date(restoreTarget.createdAt).toLocaleString()}`,
    });
    setRestoreTarget(undefined);
  };

  const handleDownload = (backup: Backup) => {
    const content = `# Backup: ${backup.reason}\n# Created: ${backup.createdAt}\n\n127.0.0.1 localhost\n# >>> HostPilot START: demo-local\n127.0.0.1 web.local\n127.0.0.1 api.local\n# <<< HostPilot END: demo-local\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hosts-backup-${backup.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const totalSize = backups.reduce((sum, b) => {
    const n = parseFloat(b.size);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Backups"
        subtitle="Automatic snapshots of your hosts file before every write"
        actions={
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Backup
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-violet-400">Auto Backup Strategy</p>
            <p className="text-xs text-muted-foreground mt-1">
              hostpilot automatically creates a backup of{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">/etc/hosts</code> before every write.
              You can restore any backup at any time. Backups are stored locally in{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">~/.hostpilot/backups/</code>.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{backups.length}</p>
            <p className="text-xs text-muted-foreground">Total backups</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{totalSize.toFixed(1)} KB</p>
            <p className="text-xs text-muted-foreground">Total size</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
            <p className="text-2xl font-bold text-emerald-400">Safe</p>
            <p className="text-xs text-muted-foreground">Restore status</p>
          </div>
        </div>

        {/* Backup list */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-border bg-muted/20">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Backup History</span>
          </div>
          {backups.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">
              No backups yet
            </div>
          )}
          {backups.map((backup, i) => (
            <div
              key={backup.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    i === 0 ? "bg-violet-500/20" : "bg-muted/60"
                  }`}
                >
                  <ShieldCheck
                    className={`w-4 h-4 ${i === 0 ? "text-violet-400" : "text-muted-foreground"}`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{new Date(backup.createdAt).toLocaleString()}</p>
                    {i === 0 && (
                      <Badge className="bg-violet-500/15 text-violet-400 border-0 text-[10px]">Latest</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{backup.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{backup.size}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => setRestoreTarget(backup)}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => handleDownload(backup)}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(backup)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BackupCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={() => toast.success("Backup created")}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This backup from {deleteTarget && new Date(deleteTarget.createdAt).toLocaleString()} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirm */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(undefined)}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will simulate restoring <code className="font-mono">/etc/hosts</code> to the state from{" "}
              {restoreTarget && new Date(restoreTarget.createdAt).toLocaleString()}. In the real app, this would write to the system hosts file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRestore}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
