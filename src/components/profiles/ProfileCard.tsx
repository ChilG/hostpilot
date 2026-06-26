import { Button } from "@/components/ui/button";
import { type HostProfile, type HostEntry } from "@/store/AppStore";
import { getProfileHosts } from "@/store/types";
import { useTranslation } from "@/i18n/translations";
import {
  Zap,
  Star,
  StarOff,
  Copy,
  Pencil,
  Trash2,
  BookMarked,
  MoreHorizontal,
  Download,
} from "lucide-react";

export function exportProfile(profile: HostProfile, hosts: HostEntry[]) {
  const entries = getProfileHosts(profile, hosts);
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

export interface ProfileCardProps {
  profile: HostProfile;
  hosts: HostEntry[];
  onActivate: (id: string, name: string) => void;
  onFavorite: (id: string, fav: boolean) => void;
  onDuplicate: (id: string, name: string) => void;
  onExport: (profile: HostProfile) => void;
  onEdit: (profile: HostProfile) => void;
  onDelete: (profile: HostProfile) => void;
}

export function ProfileCard({
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
  const entries = getProfileHosts(profile, hosts);

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
          role="button"
          aria-label="Activate"
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
