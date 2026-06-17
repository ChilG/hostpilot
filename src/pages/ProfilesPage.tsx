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
import { useAppStore, type HostProfile } from "@/store/AppStore";
import { ProfileFormDialog } from "@/components/profiles/ProfileFormDialog";
import { ProfileCard, exportProfile } from "@/components/profiles/ProfileCard";
import { ActiveProfileBanner } from "@/components/profiles/ActiveProfileBanner";
import { useTranslation } from "@/i18n/translations";
import { Plus } from "lucide-react";

export function ProfilesPage() {
  const {
    profiles,
    hosts,
    updateProfile,
    deleteProfile,
    duplicateProfile,
    activateProfile,
  } = useAppStore();
  const { t } = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<HostProfile | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<HostProfile | undefined>();

  const openCreate = () => {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (p: HostProfile) => {
    setFormMode("edit");
    setEditTarget(p);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteProfile(deleteTarget.id);
    toast.success(t("profileDeleted", { name: deleteTarget.name }));
    setDeleteTarget(undefined);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("profiles")}
        subtitle={t("profilesSubtitle")}
        actions={
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
            onClick={openCreate}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addProfile")}
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Active profile banner */}
        {profiles
          .filter((p) => p.active)
          .map((profile) => (
            <ActiveProfileBanner
              key={profile.id}
              profile={profile}
              onDeactivate={(id) => {
                updateProfile(id, { active: false });
                toast.success(t("profileDeactivated"));
              }}
            />
          ))}

        {/* All profiles */}
        <div className="grid grid-cols-2 gap-4">
          {profiles
            .filter((p) => !p.active)
            .map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                hosts={hosts}
                onActivate={(id, name) => {
                  activateProfile(id);
                  toast.success(t("profileActivated", { name }));
                }}
                onFavorite={(id, fav) => {
                  updateProfile(id, { favorite: fav });
                }}
                onDuplicate={(id, name) => {
                  duplicateProfile(id);
                  toast.success(t("profileDuplicated", { name }));
                }}
                onExport={(p) => {
                  exportProfile(p, hosts);
                  toast.success(t("profileExported"));
                }}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}

          {/* Add new profile */}
          <button
            onClick={openCreate}
            className="rounded-xl border border-dashed border-border bg-transparent p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all min-h-[200px] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">{t("addProfile")}</p>
          </button>
        </div>
      </div>

      <ProfileFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        profile={editTarget}
        onSave={() =>
          toast.success(formMode === "create" ? t("profileCreated") : t("profileUpdated"))
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProfileConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProfileText")} (<code className="font-mono">{deleteTarget?.name}</code>)
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
    </div>
  );
}

