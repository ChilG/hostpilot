import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { Plug, ExternalLink } from "lucide-react";

interface RecentPortsListProps {
  onOpenPort: (port: any) => void;
}

export function RecentPortsList({ onOpenPort }: RecentPortsListProps) {
  const { ports } = useAppStore();
  const { t } = useTranslation();

  const runningPorts = ports.filter((p) => p.status === "running");

  return (
    <div className="col-span-2 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("ports")}</span>
        </div>
        <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] px-1.5 py-0.5">
          {runningPorts.length} {t("active")}
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {ports.map((port) => (
          <RecentPortItem
            key={port.id}
            port={port}
            onOpen={onOpenPort}
          />
        ))}
        {ports.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">{t("noData")}</p>
        )}
      </div>
    </div>
  );
}

interface RecentPortItemProps {
  port: any;
  onOpen: (port: any) => void;
}

function RecentPortItem({ port, onOpen }: RecentPortItemProps) {
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onOpen(port)}
      className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition-colors group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            port.status === "running"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <ExternalLink className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-mono font-medium">{port.domain}</p>
          <p className="text-xs text-muted-foreground">
            {port.protocol}://{port.targetHost}:{port.port}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          className={`border-0 text-[10px] ${
            port.status === "running"
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {port.status === "running" ? t("running") : t("stopped")}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(port);
          }}
        >
          <ExternalLink className="w-3 h-3" />
          {t("openInBrowser")}
        </Button>
      </div>
    </div>
  );
}
