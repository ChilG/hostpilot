import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { FileJson, Upload, CheckCircle2, ArrowRight } from "lucide-react";

export function ImportSection() {
  const { importConfig } = useAppStore();
  const { t } = useTranslation();

  const [jsonImportStep, setJsonImportStep] = useState<"idle" | "preview" | "done">("idle");
  const [jsonImportText, setJsonImportText] = useState("");
  const [parsedJsonConfig, setParsedJsonConfig] = useState<any>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

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
        toast.error(t("invalidConfigFormat"));
      }
    } catch (err) {
      toast.error(t("jsonParseError"));
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
    try {
      const { hostsImported, groupsImported, portsImported } = importConfig(parsedJsonConfig);
      toast.success(t("importSuccessToast"), {
        description: t("importSuccessDetail", {
          hosts: hostsImported,
          groups: groupsImported,
          ports: portsImported,
        }),
      });
      setJsonImportStep("done");
    } catch (err) {
      console.error("Import failed:", err);
      toast.error(t("importFailed"), {
        description: String(err),
      });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={jsonFileRef}
        style={{ display: "none" }}
        accept=".json,application/json"
        onChange={handleJsonFileChange}
      />

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <FileJson className="w-4.5 h-4.5 text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">hostpilot.config.json</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("importConfigDetail")}</p>
        </div>
      </div>

      {jsonImportStep === "idle" && (
        <div className="space-y-3">
          <button
            className="w-full rounded-lg border-2 border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-foreground transition-all cursor-pointer"
            onClick={() => jsonFileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-violet-400" />
            <p className="text-sm font-medium">{t("clickToUploadConfig")}</p>
            <p className="text-xs">{t("supportFormatOnly")}</p>
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
            {t("validConfigFile")}
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
              {t("importConfig")}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {jsonImportStep === "done" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-4 h-4" />
            {t("importSuccessAlert")}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs cursor-pointer"
            onClick={() => setJsonImportStep("idle")}
          >
            {t("importAnother")}
          </Button>
        </div>
      )}
    </div>
  );
}
