import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppStore, type PortRule } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { ExternalLink, Plug, Pencil, Trash2 } from "lucide-react";

interface PortCheckerTabProps {
  onEditPort: (port: PortRule) => void;
  onDeletePort: (port: PortRule) => void;
  onOpenPort: (port: PortRule) => void;
}

export function PortCheckerTab({ onEditPort, onDeletePort, onOpenPort }: PortCheckerTabProps) {
  const { ports } = useAppStore();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(["running", "stopped", "unknown"] as const).map((status) => {
          const count = ports.filter((p) => p.status === status).length;
          
          // Localization map for stats label
          const label = status === "running" 
            ? t("running") 
            : status === "stopped" 
            ? t("stopped") 
            : t("unknown");

          const dotColor = status === "running"
            ? "bg-emerald-500"
            : status === "stopped"
            ? "bg-red-500"
            : "bg-amber-400";

          return (
            <div
              key={status}
              className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
            >
              <div className={`w-2 h-2 rounded-full ${dotColor}`} />
              <div>
                <p className="text-base font-bold leading-none">{count}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Port rules list */}
      <div className="space-y-2">
        {ports.map((port) => (
          <PortRuleRow
            key={port.id}
            port={port}
            onEdit={onEditPort}
            onDelete={onDeletePort}
            onOpen={onOpenPort}
          />
        ))}

        {ports.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
            <Plug className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">{t("noData")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PortRuleRowProps {
  port: PortRule;
  onEdit: (port: PortRule) => void;
  onDelete: (port: PortRule) => void;
  onOpen: (port: PortRule) => void;
}

function PortRuleRow({ port, onEdit, onDelete, onOpen }: PortRuleRowProps) {
  const { updatePort, checkPortLive } = useAppStore();
  const { t } = useTranslation();

  const statusConfig: Record<
    PortRule["status"],
    { label: string; className: string; dot: string }
  > = {
    running: {
      label: t("running"),
      className: "bg-emerald-500/15 text-emerald-400",
      dot: "bg-emerald-500",
    },
    stopped: {
      label: t("stopped"),
      className: "bg-red-500/15 text-red-400",
      dot: "bg-red-500",
    },
    unknown: {
      label: t("unknown"),
      className: "bg-amber-500/15 text-amber-400",
      dot: "bg-amber-400",
    },
  };

  const cfg = statusConfig[port.status];
  const target = `${port.protocol}://${port.targetHost}:${port.port}`;

  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:border-border/60 transition-colors group ${
        !port.enabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <Switch
          checked={port.enabled}
          onCheckedChange={() => {
            updatePort(port.id, { enabled: !port.enabled });
            toast.success(
              t("portRuleToggleSuccess", {
                status: !port.enabled ? t("statusEnabled") : t("statusDisabled"),
              })
            );
            if (!port.enabled) {
              checkPortLive(port.id, port.targetHost, port.port);
            }
          }}
          className="scale-90"
        />
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
          <Plug className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-xs">{port.domain}</span>
            <span className="text-muted-foreground text-[10px]">→</span>
            <span className="font-mono text-[10px] text-muted-foreground">{target}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="border-0 bg-slate-500/10 text-slate-400 text-[9px] px-1.5 py-0">
              :{port.port}
            </Badge>
            <Badge className="border-0 bg-sky-500/10 text-sky-400 text-[9px] px-1.5 py-0 uppercase">
              {port.protocol}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={`border-0 text-[9px] px-1.5 py-0 ${cfg.className}`}>
          <span className={`w-1 h-1 rounded-full mr-1 inline-block ${cfg.dot}`} />
          {cfg.label}
        </Badge>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1 text-indigo-400 border-indigo-400/20 hover:bg-indigo-500/5 cursor-pointer"
            disabled={!port.enabled}
            onClick={() => onOpen(port)}
          >
            <ExternalLink className="w-3 h-3" />
            {t("openInBrowser")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onEdit(port)}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={() => onDelete(port)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
