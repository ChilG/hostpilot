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
import { useAppStore, type HostGroup } from "@/store/AppStore";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { useTranslation } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { GroupCard } from "@/components/groups/GroupCard";

export function GroupsPage() {
  const { groups, hosts, deleteGroup, highlightedGroupId, setHighlightedGroupId } = useAppStore();
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
    const targetId = highlightedGroupId;
    if (targetId) {
      setHighlightedGroupId(null);
      
      let removeTimer: any;
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
          
          removeTimer = setTimeout(() => {
            element.classList.remove(
              "ring-2", 
              "ring-indigo-500", 
              "ring-offset-4", 
              "dark:ring-offset-background",
              "scale-[1.02]"
            );
          }, 2500);
        }
      }, 150);
      
      return () => {
        clearTimeout(timer);
        if (removeTimer) clearTimeout(removeTimer);
      };
    }
  }, [highlightedGroupId, groups, setHighlightedGroupId]);

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

