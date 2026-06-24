import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/AppStore";
import { NULL_PROFILE } from "@/store/types";
import { useTranslation } from "@/i18n/translations";
import { BookMarked, Globe, Plug } from "lucide-react";

export function StatusCardList() {
  const { hosts, profiles, ports } = useAppStore();
  const { t } = useTranslation();

  const activeProfile = profiles.find((p) => p.active) || profiles[0] || NULL_PROFILE;
  const enabledHosts = hosts.filter((h) => h.enabled);
  const runningPorts = ports.filter((p) => p.status === "running");

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatusCard
        icon={<BookMarked className="w-4 h-4 text-indigo-400" />}
        label={t("activeProfile")}
        value={activeProfile.name}
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5 py-0.5 animate-fade-in">
            {t("active")}
          </Badge>
        }
      />
      <StatusCard
        icon={<Globe className="w-4 h-4 text-sky-400" />}
        label={t("hosts")}
        value={`${enabledHosts.length} / ${hosts.length}`}
        badge={
          <Badge className="bg-sky-500/15 text-sky-400 border-0 text-[10px] px-1.5 py-0.5">
            {t("active")}
          </Badge>
        }
      />
      <StatusCard
        icon={<Plug className="w-4 h-4 text-amber-400" />}
        label={t("ports")}
        value={`${runningPorts.length} / ${ports.length}`}
        badge={
          <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] px-1.5 py-0.5">
            {t("live")}
          </Badge>
        }
      />
    </div>
  );
}

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: React.ReactNode;
}

function StatusCard({ icon, label, value, badge }: StatusCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center">
          {icon}
        </div>
        {badge}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}
