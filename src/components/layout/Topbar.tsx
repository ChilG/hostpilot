import { getCurrentWindow } from "@tauri-apps/api/window";
import { Bell, Search } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

async function startDrag() {
  await getCurrentWindow().startDragging();
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header
      onMouseDown={startDrag}
      className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-sm select-none cursor-default"
    >
      {/* Title — triggers drag */}
      <div className="flex flex-col justify-center flex-1 min-w-0 pr-4">
        <h1 className="text-sm font-semibold text-foreground leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground leading-tight truncate">{subtitle}</p>
        )}
      </div>

      {/* Actions — stop propagation so buttons stay clickable */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {actions}
        <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-default">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative cursor-default">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </button>
      </div>
    </header>
  );
}
