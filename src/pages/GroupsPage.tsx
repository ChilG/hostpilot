import { useState, useEffect } from "react";
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
import { useAppStore, type HostGroup, type HostEntry } from "@/store/AppStore";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { useTranslation } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Layers, Search } from "lucide-react";

export function GroupsPage() {
  const { groups, hosts, deleteGroup } = useAppStore();
  const { t } = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<HostGroup | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<HostGroup | undefined>();
  const [deleteHosts, setDeleteHosts] = useState(false);
  const [search, setSearch] = useState("");

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const targetId = (window as any).__highlightGroupId;
    if (targetId) {
      (window as any).__highlightGroupId = null;
      
      const timer = setTimeout(() => {
        const element = document.getElementById(`group-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          
          element.classList.add(
            "ring-2", 
            "ring-indigo-500", 
            "ring-offset-4", 
            "dark:ring-offset-background",
            "scale-[1.02]"
          );
          
          const removeTimer = setTimeout(() => {
            element.classList.remove(
              "ring-2", 
              "ring-indigo-500", 
              "ring-offset-4", 
              "dark:ring-offset-background",
              "scale-[1.02]"
            );
          }, 2500);
          
          return () => clearTimeout(removeTimer);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [groups]);

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

  const openDeleteConfirm = (group: HostGroup) => {
    setDeleteHosts(false);
    setDeleteTarget(group);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const assignedCount = hosts.filter((h) => h.groupId === deleteTarget.id).length;
    deleteGroup(deleteTarget.id, deleteHosts);
    
    let unassignedMsg = "";
    if (assignedCount > 0) {
      unassignedMsg = deleteHosts
        ? t("hostsDeletedDetail", { count: assignedCount })
        : t("unassignedHostsDetail", { count: assignedCount });
    }
    
    toast.success(t("groupDeletedToast", { name: deleteTarget.name, unassignedMsg }));
    setDeleteTarget(undefined);
    setDeleteHosts(false);
  };

  const assignedCount = deleteTarget
    ? hosts.filter((h) => h.groupId === deleteTarget.id).length
    : 0;

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
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              hosts={hosts}
              onEdit={openEdit}
              onDelete={openDeleteConfirm}
            />
          ))}

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

      <AlertDialog 
        open={!!deleteTarget} 
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(undefined);
            setDeleteHosts(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteGroupConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteGroupText")}</AlertDialogDescription>
            {assignedCount > 0 && (
              <div 
                className="flex items-center space-x-2.5 p-3 rounded-lg bg-muted/40 border border-border/50 mt-4 select-none cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => setDeleteHosts(!deleteHosts)}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  deleteHosts ? "bg-red-600 border-red-600 text-white" : "border-muted-foreground/45 bg-transparent"
                }`}>
                  {deleteHosts && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-foreground">
                  {t("deleteAssociatedHostsCheckbox", { count: assignedCount })}
                </span>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface GroupCardProps {
  group: HostGroup;
  hosts: HostEntry[];
  onEdit: (group: HostGroup) => void;
  onDelete: (group: HostGroup) => void;
}

function GroupCard({ group, hosts, onEdit, onDelete }: GroupCardProps) {
  const { t } = useTranslation();
  const { toggleGroupHosts } = useAppStore();
  const groupHosts = hosts.filter((h) => h.groupId === group.id);
  const enabledCount = groupHosts.filter((h) => h.enabled).length;

  const handleToggleHosts = (enabled: boolean) => {
    toggleGroupHosts(group.id, enabled);
    toast.success(
      enabled
        ? t("groupHostsEnabledToast", { name: group.name })
        : t("groupHostsDisabledToast", { name: group.name })
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 hover:border-border/80 transition-colors group">
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
            onClick={() => onEdit(group)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(group)}
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

      {/* Stats & Actions */}
      <div className="flex items-center justify-between pt-4 pl-2 border-t border-border">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-lg font-bold leading-none">{groupHosts.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("totalHosts")}</p>
          </div>
          <div>
            <p className="text-lg font-bold leading-none text-emerald-500">{enabledCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("enabled")}</p>
          </div>
          <div>
            <p className="text-lg font-bold leading-none text-muted-foreground">
              {groupHosts.length - enabledCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("inactive")}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            size="xs"
            variant="outline"
            className="border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-500/90 hover:text-emerald-500 gap-1 h-6 px-2 text-[10px] cursor-pointer"
            onClick={() => handleToggleHosts(true)}
            disabled={groupHosts.length === 0 || enabledCount === groupHosts.length}
          >
            {t("enableAll")}
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-destructive/90 hover:text-destructive gap-1 h-6 px-2 text-[10px] cursor-pointer"
            onClick={() => handleToggleHosts(false)}
            disabled={groupHosts.length === 0 || enabledCount === 0}
          >
            {t("disableAll")}
          </Button>
        </div>
      </div>

      {/* Host list */}
      {groupHosts.length > 0 && (
        <div className="space-y-1">
          {groupHosts.slice(0, 5).map((h) => (
            <GroupHostRow key={h.id} host={h} />
          ))}
          {groupHosts.length > 5 && (
            <div className="text-center pt-1.5 text-xs text-muted-foreground font-medium border-t border-dashed border-border/50 mt-1">
              {t("moreHostsCount", { count: groupHosts.length - 5 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface GroupHostRowProps {
  host: HostEntry;
}

function GroupHostRow({ host }: GroupHostRowProps) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/40">
      <span className="font-mono text-xs text-foreground/80">{host.domain}</span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          host.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
        }`}
      />
    </div>
  );
}
