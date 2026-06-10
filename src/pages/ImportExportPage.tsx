import { useState, useRef } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/AppStore";
import {
  Upload,
  Download,
  FileJson,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Tab = "import" | "export";

const sampleHostsLocal = `127.0.0.1   web.local
127.0.0.1   api.local
127.0.0.1   admin.local
127.0.0.1   auth.local`;

const sampleConfigJson = JSON.stringify(
  {
    version: "1.0.0",
    project: "demo-local",
    name: "Demo Local ENV",
    entries: [
      { domain: "web.local", ip: "127.0.0.1", enabled: true, group: "frontend" },
      { domain: "api.local", ip: "127.0.0.1", enabled: true, group: "backend" },
    ],
    ports: [
      { domain: "web.local", targetHost: "127.0.0.1", port: 3000, protocol: "http" },
      { domain: "api.local", targetHost: "127.0.0.1", port: 8080, protocol: "http" },
    ],
  },
  null,
  2
);

export function ImportExportPage() {
  const { hosts, groups, profiles, ports, addHost, addPort, addGroup } = useAppStore();

  const [tab, setTab] = useState<Tab>("import");

  // hosts.local import state
  const [hostsImportStep, setHostsImportStep] = useState<"idle" | "preview" | "done">("idle");
  const [hostsImportText, setHostsImportText] = useState(sampleHostsLocal);
  const [parsedHosts, setParsedHosts] = useState<{ ip: string; domain: string }[]>([]);
  const hostsFileRef = useRef<HTMLInputElement>(null);

  // config.json import state
  const [jsonImportStep, setJsonImportStep] = useState<"idle" | "preview" | "done">("idle");
  const [jsonImportText, setJsonImportText] = useState(sampleConfigJson);
  const [parsedJsonConfig, setParsedJsonConfig] = useState<any>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  // export state
  const [exportScope, setExportScope] = useState<"active" | "all">("active");

  const activeProfile = profiles.find((p) => p.active) || profiles[0];
  const activeHostIds = activeProfile ? activeProfile.entryIds : [];
  const exportHosts = exportScope === "active" ? hosts.filter((h) => activeHostIds.includes(h.id)) : hosts;

  // Generate dynamic hosts.local content
  const getHostsLocalString = () => {
    return [
      `# >>> HostPilot START: ${activeProfile?.name || "default"}`,
      ...exportHosts.map((h) => `${h.ip.padEnd(16)}${h.domain}`),
      `# <<< HostPilot END: ${activeProfile?.name || "default"}`
    ].join("\n");
  };

  // Generate dynamic JSON config content
  const getJsonString = () => {
    return JSON.stringify(
      {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        hosts: exportHosts,
        groups,
        profiles: exportScope === "active" && activeProfile ? [activeProfile] : profiles,
        ports,
      },
      null,
      2
    );
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded successfully!`);
  };

  // Process hosts.local text
  const processHostsText = (text: string) => {
    const lines = text.split("\n");
    const results: { ip: string; domain: string }[] = [];
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const ip = parts[0];
        const domain = parts[1];
        if (ip && domain) {
          results.push({ ip, domain });
        }
      }
    }
    setParsedHosts(results);
    setHostsImportText(text);
    setHostsImportStep("preview");
  };

  const handleHostsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processHostsText(text);
    };
    reader.readAsText(file);
  };

  const triggerHostsImport = () => {
    if (parsedHosts.length === 0) {
      toast.error("No valid host entries found to import.");
      return;
    }
    let importedCount = 0;
    parsedHosts.forEach((h) => {
      // Prevent duplicates
      if (!hosts.some((existing) => existing.domain === h.domain)) {
        addHost({
          domain: h.domain,
          ip: h.ip,
          enabled: true,
          description: "Imported via hosts.local",
          source: "imported",
        });
        importedCount++;
      }
    });
    toast.success(`Hosts import completed!`, {
      description: `Imported ${importedCount} new hosts (${parsedHosts.length - importedCount} duplicate domains skipped).`,
    });
    setHostsImportStep("done");
  };

  // Process config.json text
  const processJsonText = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const hostsData = parsed.hosts || parsed.entries;
      const profilesData = parsed.profiles;
      const groupsData = parsed.groups;
      const portsData = parsed.ports;

      if (hostsData || profilesData || groupsData || portsData) {
        setParsedJsonConfig(parsed);
        setJsonImportText(text);
        setJsonImportStep("preview");
      } else {
        toast.error("Invalid config format: no valid hosts, groups, profiles, or ports data found.");
      }
    } catch (err) {
      toast.error("Failed to parse JSON configuration file.");
    }
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processJsonText(text);
    };
    reader.readAsText(file);
  };

  const triggerJsonImport = () => {
    if (!parsedJsonConfig) return;
    const hostsData: any[] = parsedJsonConfig.hosts || parsedJsonConfig.entries || [];
    const groupsData: any[] = parsedJsonConfig.groups || [];
    const portsData: any[] = parsedJsonConfig.ports || [];

    let hostsImported = 0;
    let groupsImported = 0;
    let portsImported = 0;

    // 1. Groups
    groupsData.forEach((g) => {
      if (g.name && !groups.some((existing) => existing.name === g.name)) {
        addGroup({ name: g.name, color: g.color || "gray", description: g.description });
        groupsImported++;
      }
    });

    // 2. Hosts
    hostsData.forEach((h) => {
      const domain = h.domain || h.name;
      if (domain && h.ip && !hosts.some((existing) => existing.domain === domain)) {
        const groupMatch = groups.find((existing) => existing.name === h.group);
        addHost({
          domain,
          ip: h.ip,
          enabled: h.enabled !== false,
          description: h.description || "Imported from config JSON",
          groupId: groupMatch?.id,
          source: "imported",
        });
        hostsImported++;
      }
    });

    // 3. Ports
    portsData.forEach((p) => {
      if (p.domain && p.port) {
        addPort({
          domain: p.domain,
          targetHost: p.targetHost || "127.0.0.1",
          port: Number(p.port),
          protocol: p.protocol === "https" ? "https" : "http",
          enabled: p.enabled !== false,
          status: p.status === "running" || p.status === "stopped" || p.status === "unknown" ? p.status : "stopped",
        });
        portsImported++;
      }
    });

    toast.success("Configuration successfully imported!", {
      description: `Added ${hostsImported} hosts, ${groupsImported} groups, and ${portsImported} port rules.`,
    });
    setJsonImportStep("done");
  };

  const simulateHostsImport = () => {
    processHostsText(sampleHostsLocal);
  };

  const simulateJsonImport = () => {
    processJsonText(sampleConfigJson);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Import / Export"
        subtitle="Transfer host configurations between environments"
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={hostsFileRef}
          style={{ display: "none" }}
          accept=".local,.txt,text/plain"
          onChange={handleHostsFileChange}
        />
        <input
          type="file"
          ref={jsonFileRef}
          style={{ display: "none" }}
          accept=".json,application/json"
          onChange={handleJsonFileChange}
        />

        {/* Tab Selection */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(["import", "export"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "import" ? (
                <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Import</span>
              ) : (
                <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Export</span>
              )}
            </button>
          ))}
        </div>

        {tab === "import" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* hosts.local import */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5 text-sky-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">hosts.local</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Import from a project's <code className="font-mono">.hostpilot/hosts.local</code> file
                    </p>
                  </div>
                </div>

                {hostsImportStep === "idle" && (
                  <div className="space-y-3">
                    <button
                      className="w-full rounded-lg border-2 border-dashed border-border p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-foreground transition-all"
                      onClick={() => hostsFileRef.current?.click()}
                    >
                      <Upload className="w-6 h-6" />
                      <p className="text-sm font-medium">Click to upload file</p>
                      <p className="text-xs">.local, .txt, or standard hosts format</p>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-indigo-400 hover:text-indigo-300"
                      onClick={simulateHostsImport}
                    >
                      Simulate Sample Import
                    </Button>
                  </div>
                )}

                {hostsImportStep === "preview" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-[10px] font-mono text-muted-foreground/60 mb-2">hosts.local — preview</p>
                      <pre className="text-xs font-mono text-emerald-400 leading-5">{hostsImportText}</pre>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded-md px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {parsedHosts.length} valid entries detected.
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setHostsImportStep("idle")}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                        onClick={triggerHostsImport}
                      >
                        Import
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {hostsImportStep === "done" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-4 py-3">
                      <CheckCircle2 className="w-4 h-4" />
                      Import complete! Hosts merged successfully.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => setHostsImportStep("idle")}
                    >
                      Import Another
                    </Button>
                  </div>
                )}
              </div>

              {/* Config JSON import */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    <FileJson className="w-4.5 h-4.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">hostpilot.config.json</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Full configuration with hosts, groups, profiles, and ports
                    </p>
                  </div>
                </div>

                {jsonImportStep === "idle" && (
                  <div className="space-y-3">
                    <button
                      className="w-full rounded-lg border-2 border-dashed border-border p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-foreground transition-all"
                      onClick={() => jsonFileRef.current?.click()}
                    >
                      <Upload className="w-6 h-6" />
                      <p className="text-sm font-medium">Click to upload file</p>
                      <p className="text-xs">.json config file</p>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-violet-400 hover:text-violet-300"
                      onClick={simulateJsonImport}
                    >
                      Simulate Sample Import
                    </Button>
                  </div>
                )}

                {jsonImportStep === "preview" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/40 p-3 max-h-40 overflow-y-auto">
                      <p className="text-[10px] font-mono text-muted-foreground/60 mb-2">config.json — preview</p>
                      <pre className="text-xs font-mono text-violet-400 leading-5">{jsonImportText}</pre>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 rounded-md px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valid config file detected. Ready to merge.
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setJsonImportStep("idle")}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                        onClick={triggerJsonImport}
                      >
                        Import Config
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {jsonImportStep === "done" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-4 py-3">
                      <CheckCircle2 className="w-4 h-4" />
                      Config successfully merged into your workspace!
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => setJsonImportStep("idle")}
                    >
                      Import Another
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Import Behavior Options */}
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium mb-3">Import Behavior Options</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Merge", desc: "Add new entries, keep existing ones", active: true },
                  { label: "Replace Profile", desc: "Replace only managed block entries", active: false },
                  { label: "Full Replace", desc: "Replace all hostpilot-managed entries", active: false },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      opt.active
                        ? "border-indigo-500/40 bg-indigo-500/10"
                        : "border-border hover:border-border/60 cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {opt.active && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                      <p className="text-xs font-semibold">{opt.label}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Export hosts.local */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5 text-sky-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Export hosts.local</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Standard hosts file format</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs font-mono text-muted-foreground leading-5">{getHostsLocalString()}</pre>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={() => handleDownload("hosts.local", getHostsLocalString())}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download hosts.local
                </Button>
              </div>

              {/* Export config.json */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    <FileJson className="w-4.5 h-4.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Export hostpilot.config.json</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Full config with all settings</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs font-mono text-muted-foreground leading-5">{getJsonString()}</pre>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => handleDownload("hostpilot.config.json", getJsonString())}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download config.json
                </Button>
              </div>
            </div>

            {/* Export scope selector */}
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium mb-3">Export Scope</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: "active", label: "Active Profile", count: exportScope === "active" ? exportHosts.length : activeHostIds.length },
                  { id: "all", label: "All Hosts", count: exportScope === "all" ? exportHosts.length : hosts.length },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    onClick={() => setExportScope(scope.id as "active" | "all")}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      exportScope === scope.id ? "border-indigo-500/40 bg-indigo-500/10" : "border-border hover:border-border/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {exportScope === scope.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                      <p className="text-xs font-semibold">{scope.label}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{scope.count} entries</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
