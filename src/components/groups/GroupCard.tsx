import { useTranslation } from "@/i18n/translations";
import { useAppStore } from "@/store/AppStore";
import { type HostGroup, type HostEntry } from "@/store/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Layers, Pencil, Trash2 } from "lucide-react";

interface GroupCardProps {
  group: HostGroup;
  hosts: HostEntry[];
  onEdit: (group: HostGroup) => void;
  onDelete: (group: HostGroup) => void;
}

export function GroupCard({ group, hosts, onEdit, onDelete }: GroupCardProps) {
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
