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
import { useAppStore, type HostProfile, type HostEntry } from "@/store/AppStore";
import { ProfileFormDialog } from "@/components/profiles/ProfileFormDialog";
import { useTranslation } from "@/i18n/translations";
import {
  Plus,
  Zap,
  Star,
  StarOff,
  Copy,
  Pencil,
  Trash2,
  BookMarked,
  CheckCircle2,
  MoreHorizontal,
  Download,
} from "lucide-react";

function exportProfile(profile: HostProfile, hosts: HostEntry[]) {
  const entries = hosts.filter((h) => profile.entryIds.includes(h.id));
  const data = {
    version: "1.0.0",
    profile: profile.name,
    description: profile.description,
    entries: entries.map((h) => ({ domain: h.domain, ip: h.ip, enabled: h.enabled })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${profile.name.toLowerCase().replace(/\s+/g, "-")}-profile.json`;
  a.click();
  URL.revokeObjectURL(url);
}

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
            <div
              key={profile.id}
              className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{profile.name}</p>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
                      {t("active")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{profile.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-lg font-bold">{profile.entryIds.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t("hostsEnabledCount")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    updateProfile(profile.id, { active: false });
                    toast.success(t("profileDeactivated"));
                  }}
                >
                  {t("deactivate")}
                </Button>
              </div>
            </div>
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

interface ProfileCardProps {
  profile: HostProfile;
  hosts: HostEntry[];
  onActivate: (id: string, name: string) => void;
  onFavorite: (id: string, fav: boolean) => void;
  onDuplicate: (id: string, name: string) => void;
  onExport: (profile: HostProfile) => void;
  onEdit: (profile: HostProfile) => void;
  onDelete: (profile: HostProfile) => void;
}

function ProfileCard({
  profile,
  hosts,
  onActivate,
  onFavorite,
  onDuplicate,
  onExport,
  onEdit,
  onDelete,
}: ProfileCardProps) {
  const { t } = useTranslation();
  const entries = hosts.filter((h) => profile.entryIds.includes(h.id));

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 hover:border-border/60 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
            <BookMarked className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">{profile.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{profile.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFavorite(profile.id, !profile.favorite)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer"
          >
            {profile.favorite ? (
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ) : (
              <StarOff className="w-3.5 h-3.5" />
            )}
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hosts preview */}
      <div className="h-37 flex flex-col justify-between">
        <div className="space-y-1">
          {entries.slice(0, 4).map((h) => (
            <ProfileHostItem key={h.id} host={h} />
          ))}
        </div>
        {entries.length > 4 && (
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            {t("moreHostsCount", { count: entries.length - 4 })}
          </p>
        )}
        {entries.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[10px] text-muted-foreground text-center">{t("noHostsSelected")}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          onClick={() => onActivate(profile.id, profile.name)}
        >
          <Zap className="w-3 h-3" />
          {t("activate")}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title={t("duplicateProfile")}
          onClick={() => onDuplicate(profile.id, profile.name)}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="Export JSON"
          onClick={() => onExport(profile)}
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title={t("edit")}
          onClick={() => onEdit(profile)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title={t("delete")}
          onClick={() => onDelete(profile)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface ProfileHostItemProps {
  host: HostEntry;
}

function ProfileHostItem({ host }: ProfileHostItemProps) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/30">
      <span className="font-mono text-xs text-foreground/70">{host.domain}</span>
      <span className="text-[10px] font-mono text-muted-foreground">{host.ip}</span>
    </div>
  );
}
