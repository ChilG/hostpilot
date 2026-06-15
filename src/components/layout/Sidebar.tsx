import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  LayoutDashboard,
  Globe,
  Layers,
  BookMarked,
  Plug,
  ArrowLeftRight,
  ShieldCheck,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/translations";
import { useAppStore } from "@/store/AppStore";
import appLogo from "@/assets/logo.png";

async function startDrag() {
  await getCurrentWindow().startDragging();
}

export type Page =
  | "dashboard"
  | "hosts"
  | "groups"
  | "profiles"
  | "ports"

  | "import-export"
  | "backups"
  | "settings";

const navItems: { page: Page; icon: React.ElementType }[] = [
  { page: "dashboard", icon: LayoutDashboard },
  { page: "hosts", icon: Globe },
  { page: "groups", icon: Layers },
  { page: "profiles", icon: BookMarked },
  { page: "ports", icon: Plug },

  { page: "import-export", icon: ArrowLeftRight },
  { page: "backups", icon: ShieldCheck },
  { page: "settings", icon: Settings },
];

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { profiles } = useAppStore();

  const activeProfile = profiles.find((p) => p.active);

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full">
      {/* ── Traffic-light zone ────────────────────────────────────────────
           macOS overlay buttons (close/min/max) sit here.
           onMouseDown → startDragging() is the reliable Tauri v2 method.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        onMouseDown={startDrag}
        className="h-13 w-full flex-shrink-0 select-none cursor-default"
      />

      {/* Brand row — NOT a drag region so future click handlers work */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border">
        <img src={appLogo} alt="Host Pilot Logo" className="w-7 h-7 object-contain select-none pointer-events-none" />
        <span className="font-bold text-sm tracking-tight text-sidebar-foreground select-none">
          Host Pilot
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ page, icon: Icon }) => {
          const active = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  active ? "text-indigo-500" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                )}
              />
              <span className="flex-1 text-left">{t(page)}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5 text-indigo-500 opacity-60" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer status */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            activeProfile ? "bg-emerald-500" : "bg-zinc-500"
          )} />
          <span className="text-xs text-sidebar-foreground/50 truncate max-w-[170px]" title={activeProfile ? `${activeProfile.name} • ${t("active")}` : t("inactive")}>
            {activeProfile ? `${activeProfile.name} • ${t("active")}` : t("inactive")}
          </span>
        </div>
      </div>
    </aside>
  );
}
