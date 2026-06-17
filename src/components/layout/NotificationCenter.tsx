import { useAppStore } from "@/store/AppStore";
import { Bell, Check, Trash2, CheckCheck, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/translations";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, clearNotifications, markAllNotificationsAsRead } = useAppStore();
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Simple time ago formatter
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);

      if (diffSecs < 60) return t("timeJustNow");
      if (diffMins < 60) return t("timeMMinAgo", { count: diffMins });
      if (diffHours < 24) return t("timeHHourAgo", { count: diffHours });
      
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  };

  const hasUnread = notifications.some((n) => n.unread);

  return (
    <>
      {/* Invisible overlay to close on click outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Container */}
      <div className="absolute right-0 mt-2 w-80 bg-card/95 border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <span className="font-semibold text-xs text-foreground/90 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            {t("notifications")}
          </span>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button 
                onClick={markAllNotificationsAsRead}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                title={t("markAllAsRead")}
              >
                <CheckCheck className="w-3 h-3" />
                {t("active")}
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={clearNotifications}
                className="text-[10px] text-muted-foreground hover:text-destructive font-medium flex items-center gap-1 transition-colors"
                title={t("clearAll")}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("clear")}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[350px] overflow-y-auto divide-y divide-border/30">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">{t("noRecentNotifications")}</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                className={cn(
                  "p-3.5 flex items-start gap-3 transition-colors text-left",
                  notif.unread ? "bg-indigo-500/5 hover:bg-indigo-500/8" : "hover:bg-muted/30"
                )}
              >
                {/* Type Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {notif.type === "success" && <Check className="w-4 h-4 text-emerald-500" />}
                  {notif.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                  {notif.type === "warning" && <AlertCircle className="w-4 h-4 text-amber-500" />}
                  {notif.type === "info" && <Info className="w-4 h-4 text-sky-500" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-xs font-semibold leading-normal truncate",
                      notif.unread ? "text-foreground font-semibold" : "text-muted-foreground/90 font-medium"
                    )}>
                      {notif.title}
                    </p>
                    <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap pt-0.5">
                      {formatTimeAgo(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal break-words">
                    {notif.description}
                  </p>
                </div>
                
                {/* Unread indicator */}
                {notif.unread && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
