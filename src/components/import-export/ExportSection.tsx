import { useState } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { useAppStore, isTauri } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { FileJson, Download, CheckCircle2 } from "lucide-react";
import { isHostInProfile } from "@/store/types";

export function ExportSection() {
  const { hosts, groups, profiles, ports } = useAppStore();
  const { t } = useTranslation();

  const [exportScope, setExportScope] = useState<"active" | "all">("active");

  const activeProfile = profiles.find((p) => p.active) || profiles[0];
  const exportHosts =
    exportScope === "active"
      ? hosts.filter((h) => isHostInProfile(activeProfile, h))
      : hosts;

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
        toast.error(t("exportFailed"), {
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
      toast.success(t("exportSuccessFilename", { filename }));
    }
  };

  return (
    <div className="space-y-4">
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
          {t("downloadConfigFile")}
        </Button>
      </div>

      {/* Export scope selector */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium mb-3">{t("exportScopeTitle")}</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: "active",
              label: t("activeProfile"),
              count: hosts.filter((h) => isHostInProfile(activeProfile, h)).length,
            },
            {
              id: "all",
              label: t("allHostsLabel"),
              count: hosts.length,
            },
          ].map((scope) => (
            <button
              key={scope.id}
              onClick={() => setExportScope(scope.id as "active" | "all")}
              className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                exportScope === scope.id
                  ? "border-indigo-500/40 bg-indigo-500/10 font-medium"
                  : "border-border hover:border-border/60"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {exportScope === scope.id && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <p className="text-xs font-semibold">{scope.label}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t("entriesLabel", { count: scope.count })}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
