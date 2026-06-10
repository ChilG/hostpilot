import { useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { useAppStore, type PortRule } from "@/store/AppStore";
import { PortFormDialog } from "@/components/ports/PortFormDialog";
import { Plus, Pencil, Trash2, ExternalLink, RefreshCw, Plug } from "lucide-react";

const statusConfig: Record<PortRule["status"], { label: string; className: string; dot: string }> = {
  running: { label: "Running", className: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-500" },
  stopped: { label: "Stopped", className: "bg-red-500/15 text-red-400", dot: "bg-red-500" },
  unknown: { label: "Unknown", className: "bg-amber-500/15 text-amber-400", dot: "bg-amber-400" },
};

export function PortsPage() {
  const { ports, updatePort, deletePort } = useAppStore();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<PortRule | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<PortRule | undefined>();

  const running = ports.filter((p) => p.status === "running").length;

  const openCreate = () => {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (rule: PortRule) => {
    setFormMode("edit");
    setEditTarget(rule);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePort(deleteTarget.id);
    toast.success(`Port rule for "${deleteTarget.domain}" deleted`);
    setDeleteTarget(undefined);
  };

  const handleOpen = (port: PortRule) => {
    const url = `${port.protocol}://${port.targetHost}:${port.port}`;
    toast.info(`Opening ${url}`, { description: `→ ${port.domain}` });
    // In real app: open(url)
  };

  const checkAll = () => {
    toast.success("Port check simulated", { description: `${running} services running` });
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Ports"
        subtitle={`${running} services running · Port metadata for local domains`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={checkAll}>
              <RefreshCw className="w-3.5 h-3.5" />
              Check All
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["running", "stopped", "unknown"] as const).map((status) => {
            const count = ports.filter((p) => p.status === status).length;
            const cfg = statusConfig[status];
            return (
              <div key={status} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <div>
                  <p className="text-lg font-bold leading-none">{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Port cards */}
        {ports.map((port) => {
          const cfg = statusConfig[port.status];
          const target = `${port.protocol}://${port.targetHost}:${port.port}`;
          return (
            <div
              key={port.id}
              className={`rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:border-border/60 transition-colors group ${!port.enabled ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-4">
                <Switch
                  checked={port.enabled}
                  onCheckedChange={() => {
                    updatePort(port.id, { enabled: !port.enabled });
                    toast.success(`Port rule ${!port.enabled ? "enabled" : "disabled"}`);
                  }}
                  className="scale-90"
                />
                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Plug className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm">{port.domain}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="font-mono text-xs text-muted-foreground">{target}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="border-0 bg-slate-500/15 text-slate-400 text-[10px]">:{port.port}</Badge>
                    <Badge className="border-0 bg-sky-500/15 text-sky-400 text-[10px] uppercase">{port.protocol}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`border-0 text-[10px] ${cfg.className}`}>
                  <span className={`w-1 h-1 rounded-full mr-1 inline-block ${cfg.dot}`} />
                  {cfg.label}
                </Badge>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-indigo-400 border-indigo-400/30 hover:bg-indigo-500/10"
                    onClick={() => handleOpen(port)}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(port)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(port)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {ports.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Plug className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No port rules yet</p>
          </div>
        )}
      </div>

      <PortFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        rule={editTarget}
        onSave={() =>
          toast.success(formMode === "create" ? "Port rule added" : "Port rule updated")
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete port rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Port rule for <code className="font-mono">{deleteTarget?.domain}</code> will be permanently removed.
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
    </div>
  );
}
