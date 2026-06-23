import { useState, useEffect } from "react";
import { Sidebar, type Page } from "@/components/layout/Sidebar";
import { DashboardPage } from "@/pages/DashboardPage";
import { HostsPage } from "@/pages/HostsPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { ProfilesPage } from "@/pages/ProfilesPage";
import { PortsPage } from "@/pages/PortsPage";

import { ImportExportPage } from "@/pages/ImportExportPage";
import { BackupsPage } from "@/pages/BackupsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AppStoreProvider, useAppStore } from "@/store/AppStore";
import { Toaster, toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { OnboardingModal } from "@/components/layout/OnboardingModal";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { apiAdapter } from "@/store/apiAdapter";
import { isTauri } from "@/store/types";

const pageMap: Record<Page, React.ComponentType> = {
  dashboard: DashboardPage,
  hosts: HostsPage,
  groups: GroupsPage,
  profiles: ProfilesPage,
  ports: PortsPage,

  "import-export": ImportExportPage,
  backups: BackupsPage,
  settings: SettingsPage,
};

function AppContent() {
  const [page, setPage] = useState<Page>("dashboard");
  const { loading, onboarded } = useAppStore();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (!loading && !onboarded) {
      setOnboardingOpen(true);
    }
  }, [loading, onboarded]);

  // Handle Command Palette triggers (keyboard + custom event)
  useEffect(() => {
    const handleOpen = () => setCommandPaletteOpen(true);
    window.addEventListener("open-command-palette", handleOpen);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const handleNavigate = (e: Event) => {
      const targetPage = (e as CustomEvent).detail as Page;
      if (targetPage) setPage(targetPage);
    };
    window.addEventListener("navigate-page", handleNavigate);

    return () => {
      window.removeEventListener("open-command-palette", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("navigate-page", handleNavigate);
    };
  }, []);

  // Background dynamic host domain resolution scheduler
  useEffect(() => {
    if (loading) return;

    const intervalId = setInterval(async () => {
      const { hosts, profiles, updateHost, addNotification } = useAppStore.getState();
      const dynamicHosts = hosts.filter((h) => h.isDynamic && h.enabled);
      if (dynamicHosts.length === 0) return;

      const activeProfile = profiles.find((p) => p.active);
      const now = Date.now();

      for (const host of dynamicHosts) {
        const lastSyncedTime = host.lastSynced ? new Date(host.lastSynced).getTime() : 0;
        const intervalMs = (host.syncInterval || 300) * 1000;

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
              if (activeProfile && activeProfile.entryIds?.includes(host.id)) {
                // Fetch the updated hosts state since we just mutated it
                const updatedHosts = useAppStore.getState().hosts;
                const profileEntries = updatedHosts.filter((h) =>
                  activeProfile.entryIds?.includes(h.id)
                );

                if (isTauri) {
                  await invoke("write_hosts_block", {
                    blockName: activeProfile.name,
                    entries: profileEntries,
                  });
                }

                // Dispatch event to reload diff preview in UI
                window.dispatchEvent(new CustomEvent("hosts-file-updated"));

                toast.success(`Domain rotated: ${resolvedDomain}`);

                addNotification(
                  "Domain Rotated",
                  `Domain for ${host.description || host.domain} rotated to ${resolvedDomain}`,
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
  }, [loading]);

  const PageComponent = pageMap[page];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageComponent />
      </main>
      <OnboardingModal open={onboardingOpen} onOpenChange={setOnboardingOpen} />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={setPage}
      />
    </div>
  );
}

function App() {
  useEffect(() => {
    if (isTauri) {
      // Small delay of 1s to allow the premium splash screen animation to display beautifully
      const timer = setTimeout(() => {
        invoke("close_splashscreen").catch((err) => {
          console.error("Failed to close splashscreen:", err);
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AppStoreProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
      <Toaster position="bottom-right" theme="dark" richColors />
    </AppStoreProvider>
  );
}

export default App;
