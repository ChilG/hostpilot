import { useState } from "react";
import { toast } from "sonner";
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
import { useAppStore, type HostGroup } from "@/store/AppStore";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { useTranslation } from "@/i18n/translations";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";

export function GroupsPage() {
  const { groups, hosts, deleteGroup } = useAppStore();
  const { t } = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<HostGroup | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<HostGroup | undefined>();

  const openCreate = () => {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (group: HostGroup) => {
    setFormMode("edit");
    setEditTarget(group);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const assignedCount = hosts.filter((h) => h.groupId === deleteTarget.id).length;
    deleteGroup(deleteTarget.id);
    const unassignedMsg = assignedCount > 0
      ? t("unassignedHostsDetail", { count: assignedCount })
      : "";
    toast.success(t("groupDeletedToast", { name: deleteTarget.name, unassignedMsg }));
    setDeleteTarget(undefined);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("groups")}
        subtitle={t("groupsSubtitle")}
        actions={
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
            onClick={openCreate}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addGroup")}
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {groups.map((group) => {
            const groupHosts = hosts.filter((h) => h.groupId === group.id);
            const enabledCount = groupHosts.filter((h) => h.enabled).length;
            return (
              <div
                key={group.id}
                className="rounded-xl border border-border bg-card p-5 space-y-4 hover:border-border/80 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: group.color + "22" }}
                    >
                      <Layers className="w-4.5 h-4.5" style={{ color: group.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(group)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(group)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Color swatch */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/10"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">{group.color}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-4 pl-2 border-t border-border">
                  <div>
                    <p className="text-lg font-bold leading-none">{groupHosts.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("totalHosts")}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none text-emerald-500">{enabledCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("enabled")}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none text-muted-foreground">{groupHosts.length - enabledCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("inactive")}</p>
                  </div>
                </div>

                {/* Host list */}
                {groupHosts.length > 0 && (
                  <div className="space-y-1">
                    {groupHosts.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/40"
                      >
                        <span className="font-mono text-xs text-foreground/80">{h.domain}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${h.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new group placeholder */}
          <button
            onClick={openCreate}
            className="rounded-xl border border-dashed border-border bg-transparent p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all min-h-[200px] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">{t("addGroup")}</p>
          </button>
        </div>
      </div>

      <GroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        group={editTarget}
        onSave={() =>
          toast.success(formMode === "create" ? t("groupCreated") : t("groupUpdated"))
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteGroupConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteGroupText")}
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
