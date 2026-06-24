import { useEffect } from "react";
import { useAppStore } from "@/store/AppStore";
import { apiAdapter } from "@/store/apiAdapter";
import { applyActiveProfile } from "@/store/helpers/hostWriterHelper";
import { useTranslation } from "@/i18n/translations";
import { toast } from "sonner";

import { isHostInProfile } from "@/store/types";

/**
 * Custom hook to run a background scheduler checking dynamic hosts.
 * Resolves dynamic hosts using HTTP/script and automatically updates and re-applies changes.
 */
export function useDynamicHostScheduler(loading: boolean) {
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;

    const intervalId = setInterval(async () => {
      const { hosts, profiles, updateHost, addNotification } = useAppStore.getState();
      const dynamicHosts = hosts.filter((h) => h.isDynamic && h.enabled);
      if (dynamicHosts.length === 0) return;

      const activeProfile = profiles.find((p) => p.active);
      const now = Date.now();

      for (const host of dynamicHosts) {
        const intervalMs = (host.syncInterval || 60) * 1000;
        const lastSyncedTime = host.lastSynced ? new Date(host.lastSynced).getTime() : 0;

        if (now - lastSyncedTime >= intervalMs) {
          try {
            const resolvedDomain = await apiAdapter.resolveDynamicHost(
              host.dynamicType || "url",
              host.dynamicValue || ""
            );

            if (resolvedDomain && resolvedDomain !== host.domain) {
              // Update host domain in store
              updateHost(host.id, {
                domain: resolvedDomain,
                lastSynced: new Date().toISOString(),
              });

              // If this host is in the active profile, automatically re-apply to system hosts file
              if (isHostInProfile(activeProfile, host)) {
                await applyActiveProfile();

                toast.success(t("domainRotatedToast", { domain: resolvedDomain }));

                addNotification(
                  t("notif.domainRotatedTitle"),
                  t("notif.domainRotatedDesc", { name: host.description || host.domain, domain: resolvedDomain }),
                  "success"
                );
              }
            } else {
              // Touch lastSynced time even if domain is unchanged
              updateHost(host.id, {
                lastSynced: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.error(`Background dynamic resolver error for ${host.domain || host.id}:`, e);
          }
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [loading, t]);
}
