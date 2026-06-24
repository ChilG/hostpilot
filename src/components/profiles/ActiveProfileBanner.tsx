import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore, type HostProfile } from "@/store/AppStore";
import { getProfileHosts } from "@/store/types";
import { useTranslation } from "@/i18n/translations";
import { CheckCircle2 } from "lucide-react";

interface ActiveProfileBannerProps {
  profile: HostProfile;
  onDeactivate: (id: string) => void;
}

export function ActiveProfileBanner({ profile, onDeactivate }: ActiveProfileBannerProps) {
  const { t } = useTranslation();
  const hosts = useAppStore((state) => state.hosts);
  const resolvedHosts = getProfileHosts(profile, hosts);

  return (
    <div
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
          <p className="text-lg font-bold">{resolvedHosts.length}</p>
          <p className="text-[10px] text-muted-foreground">{t("hostsEnabledCount")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => onDeactivate(profile.id)}
        >
          {t("deactivate")}
        </Button>
      </div>
    </div>
  );
}
