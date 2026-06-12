import { useState, useRef } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { useAppStore, isTauri } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { invoke } from "@tauri-apps/api/core";
import {
  Upload,
  Download,
  FileJson,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Tab = "import" | "export";

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
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>("import");

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

  const handleDownload = async (filename: string, content: string) => {
    if (isTauri) {
      try {
        const savedPath = await invoke<string | null>("save_config_file", {
          content,
          defaultName: filename,
        });
        if (savedPath) {
          toast.success(t("exportSuccessToast"), {
            description: `Saved to: ${savedPath}`,
          });
        }
      } catch (err) {
        console.error("Export failed:", err);
        toast.error("Export failed", {
          description: String(err),
        });
      }
    } else {
      const blob = new Blob([content], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${filename} ${t("locale") === "th" ? "ดาวน์โหลดเรียบร้อยแล้ว!" : "downloaded successfully!"}`);
    }
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
        toast.error(
          t("locale") === "th"
            ? "รูปแบบไฟล์การตั้งค่าไม่ถูกต้อง: ไม่พบข้อมูลโฮสต์ กลุ่ม โปรไฟล์ หรือพอร์ต"
            : "Invalid config format: no valid hosts, groups, profiles, or ports data found."
        );
      }
    } catch (err) {
      toast.error(
        t("locale") === "th" ? "เกิดข้อผิดพลาดในการอ่านไฟล์การตั้งค่า JSON" : "Failed to parse JSON configuration file."
      );
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

    toast.success(t("importSuccessToast"), {
      description: t("locale") === "th"
        ? `เพิ่มโฮสต์ ${hostsImported} รายการ, กลุ่ม ${groupsImported} รายการ, และกฎพอร์ต ${portsImported} รายการ`
        : `Added ${hostsImported} hosts, ${groupsImported} groups, and ${portsImported} port rules.`,
    });
    setJsonImportStep("done");
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("import-export")}
        subtitle={t("importExportSubtitle")}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={jsonFileRef}
          style={{ display: "none" }}
          accept=".json,application/json"
          onChange={handleJsonFileChange}
        />

        {/* Tab Selection */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(["import", "export"] as Tab[]).map((tValue) => (
            <button
              key={tValue}
              onClick={() => setTab(tValue)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                tab === tValue
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tValue === "import" ? (
                <span className="flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  {t("locale") === "th" ? "นำเข้า" : "Import"}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  {t("locale") === "th" ? "ส่งออก" : "Export"}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "import" && (
          <div className="max-w-2xl space-y-4">
            {/* Config JSON import */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <FileJson className="w-4.5 h-4.5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">hostpilot.config.json</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("locale") === "th"
                      ? "การตั้งค่าแบบเต็มรูปแบบประกอบด้วยรายการโฮสต์ กลุ่ม โปรไฟล์ และกฎพอร์ต"
                      : "Full configuration containing hosts, groups, profiles, and ports"}
                  </p>
                </div>
              </div>

              {jsonImportStep === "idle" && (
                <div className="space-y-3">
                  <button
                    className="w-full rounded-lg border-2 border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-foreground transition-all cursor-pointer"
                    onClick={() => jsonFileRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-violet-400" />
                    <p className="text-sm font-medium">
                      {t("locale") === "th" ? "คลิกเพื่อเลือกไฟล์อัปโหลด" : "Click to upload config file"}
                    </p>
                    <p className="text-xs">
                      {t("locale") === "th" ? "รองรับโครงสร้างแบบ hostpilot.config.json เท่านั้น" : "Supports only hostpilot.config.json format"}
                    </p>
                  </button>
                </div>
              )}

              {jsonImportStep === "preview" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/40 p-3 max-h-56 overflow-y-auto">
                    <p className="text-[10px] font-mono text-muted-foreground/60 mb-2">
                      {t("previewImport")}
                    </p>
                    <pre className="text-xs font-mono text-violet-400 leading-5">{jsonImportText}</pre>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 rounded-md px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("locale") === "th" ? "ตรวจพบไฟล์การตั้งค่าที่ถูกต้อง พร้อมนำเข้าผสานข้อมูล" : "Valid config file detected. Ready to merge."}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs cursor-pointer"
                      onClick={() => setJsonImportStep("idle")}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5 cursor-pointer"
                      onClick={triggerJsonImport}
                    >
                      {t("locale") === "th" ? "นำเข้าข้อมูลการตั้งค่า" : "Import Config"}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {jsonImportStep === "done" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-4 py-3">
                    <CheckCircle2 className="w-4 h-4" />
                    {t("locale") === "th" ? "ผสานไฟล์ข้อมูลการตั้งค่าเข้าสู่พื้นที่ทำงานแล้ว!" : "Config successfully merged into your workspace!"}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs cursor-pointer"
                    onClick={() => setJsonImportStep("idle")}
                  >
                    {t("locale") === "th" ? "นำเข้าไฟล์เพิ่มเติม" : "Import Another"}
                  </Button>
                </div>
              )}
            </div>

            {/* Import Behavior Options */}
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium mb-3">
                {t("locale") === "th" ? "ตัวเลือกการนำเข้าข้อมูล" : "Import Behavior Options"}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: t("locale") === "th" ? "ผสานข้อมูล" : "Merge",
                    desc: t("locale") === "th" ? "เพิ่มรายการใหม่ โดยคงรักษาข้อมูลเดิมไว้" : "Add new entries, keep existing ones",
                    active: true,
                  },
                  {
                    label: t("locale") === "th" ? "เขียนทับโปรไฟล์" : "Replace Profile",
                    desc: t("locale") === "th" ? "เขียนทับเฉพาะข้อมูลบล็อกที่โปรแกรมคอยดูแลอยู่" : "Replace only managed block entries",
                    active: false,
                  },
                  {
                    label: t("locale") === "th" ? "เขียนทับข้อมูลทั้งหมด" : "Full Replace",
                    desc: t("locale") === "th" ? "เขียนทับไฟล์โฮสต์และประวัติทั้งหมดด้วยไฟล์นี้" : "Replace all hostpilot-managed entries",
                    active: false,
                  },
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
          <div className="max-w-2xl space-y-4">
            {/* Export config.json */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <FileJson className="w-4.5 h-4.5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t("exportConfig")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("exportConfigDesc")}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 max-h-56 overflow-y-auto">
                <pre className="text-xs font-mono text-muted-foreground leading-5">{getJsonString()}</pre>
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                onClick={() => handleDownload("hostpilot.config.json", getJsonString())}
              >
                <Download className="w-3.5 h-3.5" />
                {t("locale") === "th" ? "ดาวน์โหลดไฟล์ config.json" : "Download config.json"}
              </Button>
            </div>

            {/* Export scope selector */}
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium mb-3">
                {t("locale") === "th" ? "ขอบเขตการส่งออกข้อมูล" : "Export Scope"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: "active",
                    label: t("activeProfile"),
                    count: exportScope === "active" ? exportHosts.length : activeHostIds.length,
                  },
                  {
                    id: "all",
                    label: t("locale") === "th" ? "รายการโฮสต์ทั้งหมดในระบบ" : "All Hosts",
                    count: exportScope === "all" ? exportHosts.length : hosts.length,
                  },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    onClick={() => setExportScope(scope.id as "active" | "all")}
                    className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                      exportScope === scope.id ? "border-indigo-500/40 bg-indigo-500/10 font-medium" : "border-border hover:border-border/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {exportScope === scope.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                      <p className="text-xs font-semibold">{scope.label}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {scope.count} {t("locale") === "th" ? "รายการ" : "entries"}
                    </p>
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
