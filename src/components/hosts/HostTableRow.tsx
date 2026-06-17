import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { useAppStore, type HostEntry, type HostGroup } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { Pencil, Trash2 } from "lucide-react";

export const sourceColors: Record<HostEntry["source"], string> = {
  manual: "bg-slate-500/15 text-slate-400",
  imported: "bg-violet-500/15 text-violet-400",
};

interface HostTableRowProps {
  host: HostEntry;
  group: HostGroup | undefined;
  onEdit: (host: HostEntry) => void;
  onDelete: (host: HostEntry) => void;
}

export function HostTableRow({ host, group, onEdit, onDelete }: HostTableRowProps) {
  const { updateHost } = useAppStore();
  const { t } = useTranslation();

  return (
    <TableRow
      className={`group hover:bg-accent/30 transition-colors ${!host.enabled ? "opacity-50" : ""}`}
    >
      <TableCell className="sticky left-0 bg-background group-hover:bg-[color-mix(in_srgb,var(--accent)_30%,var(--background))] transition-colors px-6 py-3 border-r border-border z-10">
        <Switch
          checked={host.enabled}
          onCheckedChange={() => {
            updateHost(host.id, { enabled: !host.enabled });
            toast.success(`${host.domain} ${!host.enabled ? t("active") : t("inactive")}`);
          }}
          className="scale-90"
        />
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-sm font-medium text-foreground">{host.domain}</span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-xs text-muted-foreground">{host.ip}</span>
      </TableCell>
      <TableCell className="px-3 py-3">
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
      </TableCell>
      <TableCell className="px-3 py-3">
        <Badge className={`text-[10px] border-0 ${sourceColors[host.source]}`}>
          {t(host.source)}
        </Badge>
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="text-xs text-muted-foreground">{host.description ?? "—"}</span>
      </TableCell>
      <TableCell className="sticky right-0 bg-background group-hover:bg-[color-mix(in_srgb,var(--accent)_30%,var(--background))] transition-colors px-6 py-3 border-l border-border z-10">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(host)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(host)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
