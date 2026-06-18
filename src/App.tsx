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
import { Toaster } from "@/components/ui/sonner";
import { invoke } from "@tauri-apps/api/core";
import { OnboardingModal } from "@/components/layout/OnboardingModal";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    
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
