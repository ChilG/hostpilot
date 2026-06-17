import { useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { HostTableRow } from "@/components/hosts/HostTableRow";
import { useTranslation } from "@/i18n/translations";
import { Plus, Search, Filter, Globe, PowerOff } from "lucide-react";

export function HostsPage() {
  const { hosts, groups, deleteHost, disableAllHosts } = useAppStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<HostEntry | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<HostEntry | undefined>();
  const [disableAllConfirmOpen, setDisableAllConfirmOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-destructive/90 hover:text-destructive gap-1.5 h-8 text-xs cursor-pointer"
              onClick={() => setDisableAllConfirmOpen(true)}
              disabled={!hosts.some((h) => h.enabled)}
            >
              <PowerOff className="w-3.5 h-3.5" />
              {t("disableAll")}
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs cursor-pointer"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("addHost")}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background/60">
          <div className="relative flex-shrink-0 w-full max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
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
          <Table>
            <TableHeader className="sticky top-0 bg-background border-b border-border z-20">
              <TableRow>
                <TableHead className="sticky left-0 top-0 bg-background z-30 text-left text-xs text-muted-foreground font-medium px-6 py-3 w-10 border-r border-border">
                  {t("on")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("domain")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("ipAddress")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("group")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("source")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("description")}
                </TableHead>
                <TableHead className="sticky right-0 top-0 bg-background z-30 text-right text-xs text-muted-foreground font-medium px-6 py-3 border-l border-border">
                  {t("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    {t("noData")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((host) => {
                const group = groups.find((g) => g.id === host.groupId);
                return (
                  <HostTableRow
                    key={host.id}
                    host={host}
                    group={group}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                );
              })}
            </TableBody>
          </Table>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteHostConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteHostText")} (<code className="font-mono">{deleteTarget?.domain}</code>)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={disableAllConfirmOpen} onOpenChange={setDisableAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("disableAllConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("disableAllConfirmText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                disableAllHosts();
                toast.success(t("allHostsDisabledToast"));
                setDisableAllConfirmOpen(false);
              }}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

