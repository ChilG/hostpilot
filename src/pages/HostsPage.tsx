import { useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAppStore, type HostEntry } from "@/store/AppStore";
import { HostFormDialog } from "@/components/hosts/HostFormDialog";
import { useTranslation } from "@/i18n/translations";
import { Plus, Search, Pencil, Trash2, Filter, Globe } from "lucide-react";

const sourceColors: Record<HostEntry["source"], string> = {
  manual: "bg-slate-500/15 text-slate-400",
  imported: "bg-violet-500/15 text-violet-400",
};

export function HostsPage() {
  const { hosts, groups, updateHost, deleteHost } = useAppStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<HostEntry | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<HostEntry | undefined>();

  const filtered = hosts.filter((h) => {
    const matchSearch =
      h.domain.toLowerCase().includes(search.toLowerCase()) ||
      h.ip.includes(search) ||
      (h.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup ? h.groupId === filterGroup : true;
    return matchSearch && matchGroup;
  });

  const openCreate = () => {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (host: HostEntry) => {
    setFormMode("edit");
    setEditTarget(host);
    setFormOpen(true);
  };

  const confirmDelete = (host: HostEntry) => setDeleteTarget(host);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteHost(deleteTarget.id);
    toast.success(t("hostDeletedToast", { domain: deleteTarget.domain }));
    setDeleteTarget(undefined);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("hosts")}
        subtitle={`${hosts.filter((h) => h.enabled).length} ${t("active")} / ${hosts.length} ${t("hosts")}`}
        actions={
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
            onClick={openCreate}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addHost")}
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background/60">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-shrink-0">{t("group")}:</span>
            <button
              onClick={() => setFilterGroup(null)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                filterGroup === null
                  ? "bg-indigo-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t("all")}
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setFilterGroup(filterGroup === g.id ? null : g.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                  filterGroup === g.id
                    ? "text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                style={filterGroup === g.id ? { backgroundColor: g.color } : {}}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b border-border">
              <tr>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-3 w-10">On</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-3 py-3">{t("domain")}</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-3 py-3">{t("ipAddress")}</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-3 py-3">{t("group")}</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-3 py-3">Source</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-3 py-3">{t("description")}</th>
                <th className="text-right text-xs text-muted-foreground font-medium px-6 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    {t("noData")}
                  </td>
                </tr>
              )}
              {filtered.map((host) => {
                const group = groups.find((g) => g.id === host.groupId);
                return (
                  <tr
                    key={host.id}
                    className={`group hover:bg-accent/30 transition-colors ${!host.enabled ? "opacity-50" : ""}`}
                  >
                    <td className="px-6 py-3">
                      <Switch
                        checked={host.enabled}
                        onCheckedChange={() => {
                          updateHost(host.id, { enabled: !host.enabled });
                          toast.success(`${host.domain} ${!host.enabled ? t("active") : t("inactive")}`);
                        }}
                        className="scale-90"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-sm font-medium text-foreground">{host.domain}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{host.ip}</span>
                    </td>
                    <td className="px-3 py-3">
                      {group ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: group.color + "22", color: group.color }}
                        >
                          {group.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={`text-[10px] border-0 ${sourceColors[host.source]}`}>
                        {host.source}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted-foreground">{host.description ?? "—"}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(host)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => confirmDelete(host)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <HostFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        host={editTarget}
        onSave={() =>
          toast.success(formMode === "create" ? t("hostCreated") : t("hostUpdated"))
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteHostConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteHostText")} (<code className="font-mono">{deleteTarget?.domain}</code>)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
