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
  Anchor,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "hosts", label: "Hosts", icon: Globe },
  { page: "groups", label: "Groups", icon: Layers },
  { page: "profiles", label: "Profiles", icon: BookMarked },
  { page: "ports", label: "Ports", icon: Plug },

  { page: "import-export", label: "Import / Export", icon: ArrowLeftRight },
  { page: "backups", label: "Backups", icon: ShieldCheck },
  { page: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full">
      {/* ── Traffic-light zone ────────────────────────────────────────────
           macOS overlay buttons (close/min/max) sit here.
           onMouseDown → startDragging() is the reliable Tauri v2 method.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        onMouseDown={startDrag}
        className="h-[52px] w-full flex-shrink-0 select-none cursor-default"
      />

      {/* Brand row — NOT a drag region so future click handlers work */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
          <Anchor className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-sm tracking-tight text-sidebar-foreground select-none">
          hostpilot
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ page, label, icon: Icon }) => {
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
              <span className="flex-1 text-left">{label}</span>
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
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-sidebar-foreground/50">Local Dev • Active</span>
        </div>
      </div>
    </aside>
  );
}
