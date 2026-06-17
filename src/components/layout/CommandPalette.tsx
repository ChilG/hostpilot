import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/AppStore";
import { type Page } from "@/components/layout/Sidebar";
import { useTranslation } from "@/i18n/translations";
import { Search, Globe, BookMarked, Settings, ShieldCheck, ArrowLeftRight, Layers, Plug, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (page: Page) => void;
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const { t } = useTranslation();
  const { profiles, hosts, activateProfile, updateHost } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  if (!open) return null;

  // Filter items
  const pages: { id: Page; name: string; category: "navigation"; icon: any }[] = [
    { id: "dashboard", name: t("dashboard"), category: "navigation", icon: LayoutDashboard },
    { id: "hosts", name: t("hosts"), category: "navigation", icon: Globe },
    { id: "groups", name: t("groups"), category: "navigation", icon: Layers },
    { id: "profiles", name: t("profiles"), category: "navigation", icon: BookMarked },
    { id: "ports", name: t("ports"), category: "navigation", icon: Plug },
    { id: "import-export", name: t("import-export"), category: "navigation", icon: ArrowLeftRight },
    { id: "backups", name: t("backups"), category: "navigation", icon: ShieldCheck },
    { id: "settings", name: t("settings"), category: "navigation", icon: Settings },
  ];

  const filteredPages = pages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const filteredProfiles = profiles
    .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    .map(p => ({ ...p, category: "profiles" as const }));
  const filteredHosts = hosts
    .filter(h => h.domain.toLowerCase().includes(query.toLowerCase()))
    .map(h => ({ ...h, category: "hosts" as const }));

  const allItems = [...filteredPages, ...filteredProfiles, ...filteredHosts];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleAction(allItems[selectedIndex]);
      }
    }
  };

  const handleAction = (item: any) => {
    if (item.category === "navigation") {
      onNavigate(item.id);
    } else if (item.category === "profiles") {
      activateProfile(item.id);
    } else if (item.category === "hosts") {
      updateHost(item.id, { enabled: !item.enabled });
    }
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div 
        className="relative w-full max-w-lg bg-card/95 border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh] transition-all duration-300 transform scale-100"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-muted/20">
          <Search className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-none placeholder-muted-foreground text-sm py-1"
            placeholder="Search profiles, hosts, settings..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          <Badge className="bg-muted text-muted-foreground text-[10px] font-mono border-0 px-1.5 py-0.5 rounded">
            ESC
          </Badge>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2 divide-y divide-border/20">
          {allItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div>
              {/* Render items */}
              {allItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={`${item.category}-${item.id}`}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150",
                      isSelected ? "bg-accent/80 text-accent-foreground animate-none" : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                    )}
                    onClick={() => handleAction(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.category === "navigation" && (
                        <item.icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      )}
                      {item.category === "profiles" && (
                        <BookMarked className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                      {item.category === "hosts" && (
                        <Globe className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      )}
                      <span className="font-medium truncate text-foreground/90">
                        {"domain" in item ? item.domain : item.name}
                      </span>
                      {item.category === "profiles" && item.active && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                          Active
                        </Badge>
                      )}
                      {item.category === "hosts" && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] py-0 px-1.5 border-0",
                            item.enabled ? "text-sky-400 bg-sky-500/5" : "text-muted-foreground/60 bg-muted/10"
                          )}
                        >
                          {item.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground opacity-60 uppercase font-semibold tracking-wider">
                      {item.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground/60 select-none">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="font-sans font-semibold">↑↓</kbd> to navigate</span>
            <span><kbd className="font-sans font-semibold">↵</kbd> to select</span>
          </div>
          <span>Command Palette</span>
        </div>
      </div>
    </div>
  );
}
