import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck,
  Bell,
  Palette,
  Info,
  ChevronRight,
  Globe,
} from "lucide-react";

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 pr-8">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, children }: SettingsSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="px-5 divide-y divide-border">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" subtitle="Configure hostpilot preferences" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Hosts File */}
        <SettingsSection
          icon={<Globe className="w-4 h-4 text-sky-400" />}
          title="Hosts File"
        >
          <SettingRow
            label="Hosts file path"
            description="System hosts file location"
          >
            <div className="flex items-center gap-2">
              <Input
                defaultValue="/etc/hosts"
                className="h-8 text-xs w-48 font-mono"
              />
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Browse
              </Button>
            </div>
          </SettingRow>
          <SettingRow
            label="Preview before applying"
            description="Show diff preview before writing to hosts file"
          >
            <Switch defaultChecked />
          </SettingRow>
          <SettingRow
            label="Backup before every write"
            description="Auto-create a backup snapshot before each modification"
          >
            <Switch defaultChecked />
          </SettingRow>
          <SettingRow
            label="Validate before writing"
            description="Check for duplicate domains and invalid IPs before applying"
          >
            <Switch defaultChecked />
          </SettingRow>
        </SettingsSection>

        {/* Backups */}
        <SettingsSection
          icon={<ShieldCheck className="w-4 h-4 text-violet-400" />}
          title="Backups"
        >
          <SettingRow
            label="Backup directory"
            description="Where hostpilot stores hosts file backups"
          >
            <div className="flex items-center gap-2">
              <Input
                defaultValue="~/.hostpilot/backups"
                className="h-8 text-xs w-48 font-mono"
              />
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Browse
              </Button>
            </div>
          </SettingRow>
          <SettingRow
            label="Keep backups"
            description="Number of backup snapshots to retain"
          >
            <Input defaultValue="10" className="h-8 text-xs w-20 text-center" type="number" />
          </SettingRow>
          <SettingRow
            label="Auto-cleanup old backups"
            description="Automatically delete backups beyond retention limit"
          >
            <Switch defaultChecked />
          </SettingRow>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          icon={<Bell className="w-4 h-4 text-amber-400" />}
          title="Notifications"
        >
          <SettingRow
            label="Show apply notifications"
            description="Notify when hosts file is successfully updated"
          >
            <Switch defaultChecked />
          </SettingRow>
          <SettingRow
            label="Show error alerts"
            description="Alert when applying hosts entries fails"
          >
            <Switch defaultChecked />
          </SettingRow>
          <SettingRow
            label="Port status alerts"
            description="Notify when a tracked service goes offline"
          >
            <Switch />
          </SettingRow>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={<Palette className="w-4 h-4 text-indigo-400" />}
          title="Appearance"
        >
          <SettingRow label="Color theme" description="Choose app theme">
            <div className="flex gap-1.5">
              {["Dark", "Light", "System"].map((theme, i) => (
                <button
                  key={theme}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    i === 0
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow
            label="Compact mode"
            description="Reduce spacing for a denser layout"
          >
            <Switch />
          </SettingRow>
        </SettingsSection>

        {/* About */}
        <SettingsSection
          icon={<Info className="w-4 h-4 text-muted-foreground" />}
          title="About"
        >
          <SettingRow label="Version" description="Current app version">
            <Badge className="bg-muted text-muted-foreground border-0 font-mono text-xs">
              v0.1.0
            </Badge>
          </SettingRow>
          <SettingRow label="Check for updates" description="Last checked: today">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Check Now
            </Button>
          </SettingRow>
          <div className="py-4">
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              View open source licenses
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

