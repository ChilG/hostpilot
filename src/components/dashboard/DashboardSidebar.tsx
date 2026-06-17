import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore, isTauri } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { ShieldCheck, Clock, Zap } from "lucide-react";

interface DashboardSidebarProps {
  onRestoreClick: () => void;
  onActivateProfile: (profileId: string, name: string) => void;
}

export function DashboardSidebar({ onRestoreClick, onActivateProfile }: DashboardSidebarProps) {
  const { backups, profiles } = useAppStore();
  const { t } = useTranslation();

  const lastBackup = backups[0];

  return (
    <div className="space-y-4">
      {/* Hosts file status */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{t("hostsFileSettings")}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("hostsFilePath")}</span>
            <span className="font-mono text-foreground/80 truncate max-w-[120px]">
              {isTauri
                ? navigator.userAgent.includes("Windows")
                  ? "C:\\...\\etc\\hosts"
                  : "/etc/hosts"
                : "/etc/hosts"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("status")}</span>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5">
              {t("active")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Last backup */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium">{t("backups")}</span>
          </div>
        </div>
        <div className="space-y-2">
          {lastBackup ? (
            <>
              <p className="text-xs text-muted-foreground truncate">{lastBackup.reason}</p>
              <p className="text-xs font-mono text-foreground/60">
                {new Date(lastBackup.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{lastBackup.size}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noData")}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          disabled={!lastBackup}
          onClick={onRestoreClick}
        >
          {t("restore")}
        </Button>
      </div>

      {/* Recent Profiles */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium">{t("recentProfiles")}</span>
          </div>
        </div>
        <div className="space-y-2">
          {profiles.slice(0, 3).map((profile) => (
            <RecentProfileItem
              key={profile.id}
              profile={profile}
              onActivate={onActivateProfile}
            />
          ))}
          {profiles.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">{t("noData")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface RecentProfileItemProps {
  profile: any;
  onActivate: (profileId: string, name: string) => void;
}

function RecentProfileItem({ profile, onActivate }: RecentProfileItemProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-xs">
      <div className="truncate pr-2">
        <p className="font-medium truncate">{profile.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{profile.description}</p>
      </div>
      <div className="flex-shrink-0">
        {profile.active ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
            {t("active")}
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
            onClick={() => onActivate(profile.id, profile.name)}
          >
            <Zap className="w-2.5 h-2.5" />
            {t("confirm")}
          </Button>
        )}
      </div>
    </div>
  );
}
