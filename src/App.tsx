import { useState } from "react";
import { Sidebar, type Page } from "@/components/layout/Sidebar";
import { DashboardPage } from "@/pages/DashboardPage";
import { HostsPage } from "@/pages/HostsPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { ProfilesPage } from "@/pages/ProfilesPage";
import { PortsPage } from "@/pages/PortsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ImportExportPage } from "@/pages/ImportExportPage";
import { BackupsPage } from "@/pages/BackupsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AppStoreProvider } from "@/store/AppStore";
import { Toaster } from "@/components/ui/sonner";

const pageMap: Record<Page, React.ComponentType> = {
  dashboard: DashboardPage,
  hosts: HostsPage,
  groups: GroupsPage,
  profiles: ProfilesPage,
  ports: PortsPage,
  projects: ProjectsPage,
  "import-export": ImportExportPage,
  backups: BackupsPage,
  settings: SettingsPage,
};

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const PageComponent = pageMap[page];

  return (
    <AppStoreProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden dark">
        <Sidebar activePage={page} onNavigate={setPage} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <PageComponent />
        </main>
      </div>
      <Toaster position="bottom-right" theme="dark" richColors />
    </AppStoreProvider>
  );
}

export default App;
